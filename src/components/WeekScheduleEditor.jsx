import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import EmptyState from './EmptyState'
import LoadingState from './LoadingState'

const dayLabels = [
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
  '일요일',
]

function toDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDate(dateString) {
  const [year, month, day] = dateString
    .split('-')
    .map(Number)

  return new Date(year, month - 1, day)
}

function getMonday(date = new Date()) {
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const day = target.getDay()
  const diff = day === 0 ? -6 : 1 - day

  target.setDate(target.getDate() + diff)

  return target
}

function addDays(date, amount) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function formatShortDate(dateString) {
  const date = parseDate(dateString)

  return `${date.getMonth() + 1}/${date.getDate()}`
}

function WeekScheduleEditor({
  students,
  onClose,
  onSaved,
}) {
  const { user, profile } = useAuth()

  const [weekStart, setWeekStart] = useState(
    toDateString(getMonday()),
  )

  const [items, setItems] = useState([])
  const [teachers, setTeachers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [addDate, setAddDate] = useState(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [addStudentId, setAddStudentId] = useState('')
  const [addTeacherId, setAddTeacherId] = useState('')
  const [addStartTime, setAddStartTime] = useState('')
  const [addEndTime, setAddEndTime] = useState('')

  const weekDays = useMemo(() => {
    const monday = parseDate(weekStart)

    return dayLabels.map((label, index) => {
      const date = addDays(monday, index)

      return {
        label,
        date: toDateString(date),
      }
    })
  }, [weekStart])

  const activeStudents = useMemo(
    () =>
      students.filter(
        (student) => student.status === 'active',
      ),
    [students],
  )

  const visibleStudents = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase()

    if (!keyword) {
      return activeStudents
    }

    return activeStudents.filter((student) =>
      [
        student.name,
        student.school,
        student.grade,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    )
  }, [activeStudents, studentSearch])

  const loadWeek = async () => {
    setIsLoading(true)
    setErrorMessage('')

    const requests = [
      supabase.rpc('get_week_schedule', {
        p_week_start: weekStart,
      }),
    ]

    if (profile?.role === 'admin') {
      requests.push(
        supabase
          .from('profiles')
          .select('id, full_name, role')
          .order('full_name', {
            ascending: true,
          }),
      )
    }

    const results = await Promise.all(requests)
    const scheduleResult = results[0]

    if (scheduleResult.error) {
      console.error(scheduleResult.error)
      setErrorMessage(
        scheduleResult.error.message ||
          '한 주 수업 일정을 불러오지 못했습니다.',
      )
      setItems([])
      setIsLoading(false)
      return
    }

    const normalized = (scheduleResult.data ?? []).map(
      (item, index) => ({
        localId: `${item.schedule_id}-${item.class_date}-${index}`,
        schedule_id: item.schedule_id,
        class_date: item.class_date,
        student_id: item.student_id,
        student_name: item.student_name,
        school: item.school,
        grade: item.grade,
        teacher_id: item.teacher_id,
        teacher_name: item.teacher_name,
        start_time: item.start_time?.slice(0, 5) ?? '',
        end_time: item.end_time?.slice(0, 5) ?? '',
        source_schedule_id:
          item.source_schedule_id ?? null,
        source_type: item.source_type,
      }),
    )

    setItems(normalized)

    if (profile?.role === 'admin') {
      const teachersResult = results[1]

      if (teachersResult.error) {
        console.error(teachersResult.error)
        setTeachers([])
      } else {
        setTeachers(teachersResult.data ?? [])
      }
    } else if (user) {
      setTeachers([
        {
          id: user.id,
          full_name:
            profile?.full_name ?? '담당 선생님',
          role: profile?.role ?? 'teacher',
        },
      ])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    if (user && profile) {
      loadWeek()
    }
  }, [weekStart, user, profile])

  const moveWeek = (amount) => {
    const current = parseDate(weekStart)
    current.setDate(current.getDate() + amount * 7)
    setWeekStart(toDateString(current))
  }

  const goCurrentWeek = () => {
    setWeekStart(toDateString(getMonday()))
  }

  const updateTime = (localId, field, value) => {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    )
  }

  const removeItem = (localId) => {
    setItems((current) =>
      current.filter(
        (item) => item.localId !== localId,
      ),
    )
  }

  const clearDay = (day) => {
    const dayItems = items.filter(
      (item) => item.class_date === day.date,
    )

    if (dayItems.length === 0) {
      return
    }

    const confirmed = window.confirm(
      `${day.label}(${formatShortDate(
        day.date,
      )}) 수업 ${dayItems.length}개를 모두 지울까요?\n저장하기 전까지는 DB에 반영되지 않습니다.`,
    )

    if (!confirmed) {
      return
    }

    setItems((current) =>
      current.filter(
        (item) => item.class_date !== day.date,
      ),
    )
  }

  const resetAddForm = () => {
    setAddDate(null)
    setStudentSearch('')
    setAddStudentId('')
    setAddTeacherId('')
    setAddStartTime('')
    setAddEndTime('')
  }

  const openAddStudent = (date) => {
    setAddDate(date)
    setStudentSearch('')
    setAddStudentId('')
    setAddStartTime('')
    setAddEndTime('')

    if (profile?.role === 'admin') {
      setAddTeacherId('')
    } else {
      setAddTeacherId(user?.id ?? '')
    }
  }

  const selectStudent = (studentId) => {
    setAddStudentId(studentId)

    if (profile?.role !== 'admin') {
      return
    }

    const existingTeacherIds = [
      ...new Set(
        items
          .filter(
            (item) =>
              item.student_id === studentId,
          )
          .map((item) => item.teacher_id)
          .filter(Boolean),
      ),
    ]

    setAddTeacherId(
      existingTeacherIds.length === 1
        ? existingTeacherIds[0]
        : '',
    )
  }

  const addStudentToDay = () => {
    if (!addStudentId) {
      alert('추가할 학생을 선택해주세요.')
      return
    }

    if (!addTeacherId) {
      alert('담당 선생님을 선택해주세요.')
      return
    }

    if (!addStartTime || !addEndTime) {
      alert('수업 시작시간과 종료시간을 입력해주세요.')
      return
    }

    if (addEndTime <= addStartTime) {
      alert('종료시간은 시작시간보다 늦어야 합니다.')
      return
    }

    const student = activeStudents.find(
      (item) => item.id === addStudentId,
    )

    const teacher = teachers.find(
      (item) => item.id === addTeacherId,
    )

    if (!student) {
      alert('학생 정보를 찾을 수 없습니다.')
      return
    }

    setItems((current) => [
      ...current,
      {
        localId: `new-${Date.now()}-${student.id}`,
        schedule_id: null,
        class_date: addDate,
        student_id: student.id,
        student_name: student.name,
        school: student.school,
        grade: student.grade,
        teacher_id: addTeacherId,
        teacher_name:
          teacher?.full_name ?? '담당 선생님',
        start_time: addStartTime,
        end_time: addEndTime,
        source_schedule_id: null,
        source_type: 'one_off',
      },
    ])

    resetAddForm()
  }

  const validateItems = () => {
    for (const item of items) {
      if (!item.start_time || !item.end_time) {
        return `${item.student_name} 학생의 수업 시간을 입력해주세요.`
      }

      if (item.end_time <= item.start_time) {
        return `${item.student_name} 학생의 종료시간은 시작시간보다 늦어야 합니다.`
      }

      if (!item.teacher_id) {
        return `${item.student_name} 학생의 담당 선생님이 없습니다.`
      }
    }

    return null
  }

  const saveWeek = async () => {
    const validationMessage = validateItems()

    if (validationMessage) {
      alert(validationMessage)
      return
    }

    const confirmed = window.confirm(
      `${weekStart}부터 7일간의 수업 일정을 현재 화면대로 저장할까요?`,
    )

    if (!confirmed) {
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    const payload = items.map((item) => ({
      class_date: item.class_date,
      student_id: item.student_id,
      teacher_id: item.teacher_id,
      start_time: item.start_time,
      end_time: item.end_time,
      source_schedule_id:
        item.source_schedule_id ?? null,
    }))

    const { error } = await supabase.rpc(
      'save_week_schedule',
      {
        p_week_start: weekStart,
        p_items: payload,
      },
    )

    setIsSaving(false)

    if (error) {
      console.error(error)
      setErrorMessage(
        error.message ||
          '한 주 일정 저장에 실패했습니다.',
      )
      return
    }

    alert('한 주 수업 일정이 저장되었습니다.')

    await onSaved?.()
    onClose()
  }

  const weekEnd = weekDays[6]?.date

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(17, 24, 39, 0.58)',
        padding: '24px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: 'min(1180px, 100%)',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow:
            '0 24px 70px rgba(15, 23, 42, 0.22)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '22px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              한 주 수업 수정
            </h2>

            <p
              style={{
                margin: '6px 0 0',
                color: '#6b7280',
              }}
            >
              {weekStart} ~ {weekEnd}
              {profile?.role === 'admin'
                ? ' · 학원 전체 일정'
                : ' · 내 담당 일정'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#6b7280',
            }}
          >
            닫기
          </button>
        </div>

        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => moveWeek(-1)}
            style={{
              background: '#eef2ff',
              color: '#4338ca',
            }}
          >
            ← 지난주
          </button>

          <button
            type="button"
            onClick={goCurrentWeek}
            style={{
              background: '#eef2ff',
              color: '#4338ca',
            }}
          >
            이번주
          </button>

          <button
            type="button"
            onClick={() => moveWeek(1)}
            style={{
              background: '#eef2ff',
              color: '#4338ca',
            }}
          >
            다음주 →
          </button>
        </div>

        <div
          style={{
            padding: '24px',
          }}
        >
          {errorMessage && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#fef2f2',
                color: '#b91c1c',
              }}
            >
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <LoadingState message="한 주 수업 일정을 불러오는 중..." />
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '14px',
              }}
            >
              {weekDays.map((day) => {
                const dayItems = items
                  .filter(
                    (item) =>
                      item.class_date === day.date,
                  )
                  .sort((a, b) =>
                    a.start_time.localeCompare(
                      b.start_time,
                    ),
                  )

                return (
                  <section
                    key={day.date}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '14px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '13px 15px',
                        background: '#f8fafc',
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong>
                        {day.label} ·{' '}
                        {formatShortDate(day.date)}
                      </strong>

                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            openAddStudent(day.date)
                          }
                          style={{
                            background: '#4f46e5',
                          }}
                        >
                          + 학생 추가하기
                        </button>

                        <button
                          type="button"
                          disabled={
                            dayItems.length === 0
                          }
                          onClick={() =>
                            clearDay(day)
                          }
                          style={{
                            background:
                              dayItems.length === 0
                                ? '#d1d5db'
                                : '#ef4444',
                          }}
                        >
                          {day.label} 지우기
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '14px',
                      }}
                    >
                      {dayItems.length === 0 ? (
                        <EmptyState message="수업이 없습니다." />
                      ) : (
                        <div
                          style={{
                            display: 'grid',
                            gap: '9px',
                          }}
                        >
                          {dayItems.map((item) => (
                            <div
                              key={item.localId}
                              style={{
                                display: 'grid',
                                gridTemplateColumns:
                                  'minmax(180px, 1fr) 130px 20px 130px auto',
                                gap: '10px',
                                alignItems: 'center',
                                padding: '11px 12px',
                                border:
                                  '1px solid #e5e7eb',
                                borderRadius: '10px',
                                background: '#ffffff',
                              }}
                            >
                              <div>
                                <strong>
                                  {item.student_name}
                                </strong>

                                <div
                                  style={{
                                    marginTop: '3px',
                                    color: '#6b7280',
                                    fontSize: '13px',
                                  }}
                                >
                                  {item.school}{' '}
                                  {item.grade}
                                  {item.teacher_name && (
                                    <>
                                      {' · '}
                                      {item.teacher_name}
                                    </>
                                  )}
                                </div>
                              </div>

                              <input
                                type="time"
                                value={item.start_time}
                                onChange={(event) =>
                                  updateTime(
                                    item.localId,
                                    'start_time',
                                    event.target.value,
                                  )
                                }
                              />

                              <span
                                style={{
                                  textAlign: 'center',
                                }}
                              >
                                ~
                              </span>

                              <input
                                type="time"
                                value={item.end_time}
                                onChange={(event) =>
                                  updateTime(
                                    item.localId,
                                    'end_time',
                                    event.target.value,
                                  )
                                }
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    item.localId,
                                  )
                                }
                                style={{
                                  background: '#f3f4f6',
                                  color: '#b91c1c',
                                }}
                              >
                                삭제
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '18px 24px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#e5e7eb',
              color: '#374151',
            }}
          >
            취소
          </button>

          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={saveWeek}
            style={{
              background: '#4f46e5',
            }}
          >
            {isSaving
              ? '저장 중...'
              : '한 주 변경사항 저장'}
          </button>
        </div>
      </div>

      {addDate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            background: 'rgba(17, 24, 39, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: 'min(620px, 100%)',
              maxHeight: '82vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '18px',
              padding: '22px',
              boxShadow:
                '0 20px 60px rgba(15, 23, 42, 0.25)',
            }}
          >
            <h3
              style={{
                marginTop: 0,
              }}
            >
              학생 추가 · {formatShortDate(addDate)}
            </h3>

            {!addStudentId ? (
              <>
                <input
                  type="text"
                  placeholder="학생 이름, 학교, 학년 검색"
                  value={studentSearch}
                  onChange={(event) =>
                    setStudentSearch(
                      event.target.value,
                    )
                  }
                  style={{
                    width: '100%',
                    marginBottom: '12px',
                  }}
                />

                <div
                  style={{
                    display: 'grid',
                    gap: '8px',
                  }}
                >
                  {visibleStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() =>
                        selectStudent(student.id)
                      }
                      style={{
                        background: '#f9fafb',
                        color: '#111827',
                        border:
                          '1px solid #e5e7eb',
                        textAlign: 'left',
                        padding: '12px 14px',
                      }}
                    >
                      <strong>{student.name}</strong>
                      <span
                        style={{
                          marginLeft: '8px',
                          color: '#6b7280',
                        }}
                      >
                        {student.school}{' '}
                        {student.grade}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: '#eef2ff',
                  }}
                >
                  <strong>
                    {
                      activeStudents.find(
                        (student) =>
                          student.id ===
                          addStudentId,
                      )?.name
                    }
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      setAddStudentId('')
                    }
                    style={{
                      marginLeft: '12px',
                      background: 'transparent',
                      color: '#4f46e5',
                      padding: 0,
                    }}
                  >
                    학생 다시 선택
                  </button>
                </div>

                {profile?.role === 'admin' && (
                  <div
                    style={{
                      marginBottom: '14px',
                    }}
                  >
                    <label>
                      담당 선생님
                    </label>

                    <select
                      value={addTeacherId}
                      onChange={(event) =>
                        setAddTeacherId(
                          event.target.value,
                        )
                      }
                      style={{
                        width: '100%',
                        marginTop: '6px',
                      }}
                    >
                      <option value="">
                        선생님 선택
                      </option>

                      {teachers.map((teacher) => (
                        <option
                          key={teacher.id}
                          value={teacher.id}
                        >
                          {teacher.full_name}
                          {teacher.role === 'admin'
                            ? ' (원장)'
                            : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '18px',
                  }}
                >
                  <label>
                    시작시간
                    <input
                      type="time"
                      value={addStartTime}
                      onChange={(event) =>
                        setAddStartTime(
                          event.target.value,
                        )
                      }
                      style={{
                        width: '100%',
                        marginTop: '6px',
                      }}
                    />
                  </label>

                  <label>
                    종료시간
                    <input
                      type="time"
                      value={addEndTime}
                      onChange={(event) =>
                        setAddEndTime(
                          event.target.value,
                        )
                      }
                      style={{
                        width: '100%',
                        marginTop: '6px',
                      }}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={addStudentToDay}
                  style={{
                    width: '100%',
                    background: '#4f46e5',
                  }}
                >
                  이 날짜에 추가
                </button>
              </>
            )}

            <button
              type="button"
              onClick={resetAddForm}
              style={{
                width: '100%',
                marginTop: '10px',
                background: '#e5e7eb',
                color: '#374151',
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeekScheduleEditor
