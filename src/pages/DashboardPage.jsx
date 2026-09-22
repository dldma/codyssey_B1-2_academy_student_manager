import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'

import useStudents from '../hooks/useStudents'
import useTodayAttendance from '../hooks/useTodayAttendance'

import AppHeader from '../components/AppHeader'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import TodayMemoPanel from '../components/TodayMemoPanel'
import CalendarPanel from '../components/CalendarPanel'
import ExamSchedulePanel from '../components/ExamSchedulePanel'
import WeekScheduleEditor from '../components/WeekScheduleEditor'

function DashboardPage() {
  const navigate = useNavigate()

  const {
    students,
    isLoading: studentsLoading,
  } = useStudents()

  const {
    classes,
    isLoading: attendanceLoading,
    error,
    refetch,
    today,
  } = useTodayAttendance()

  const [selectedClass, setSelectedClass] =
    useState(null)

  const [isWeekEditorOpen, setIsWeekEditorOpen] =
    useState(false)

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const [
    calendarRefreshKey,
    setCalendarRefreshKey,
  ] = useState(0)

  const formatScheduleTime = (time) => {
    if (!time) {
      return ''
    }

    return time.slice(0, 5)
  }

  const formatActualTime = (time) => {
    if (!time) {
      return ''
    }

    return new Date(time).toLocaleTimeString(
      'ko-KR',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )
  }

  const getStatusColor = (attendance) => {
    if (!attendance) {
      return '#9ca3af'
    }

    if (
      attendance.status === 'present' ||
      attendance.status === 'deferred'
    ) {
      return '#10b981'
    }

    if (attendance.status === 'completed') {
      return '#3b82f6'
    }

    if (attendance.status === 'absent') {
      return '#ef4444'
    }

    return '#9ca3af'
  }

  const getAttendanceText = (item) => {
    const attendance = item.attendance

    if (!attendance) {
      return `${formatScheduleTime(
        item.start_time,
      )} - ${formatScheduleTime(
        item.end_time,
      )}`
    }

    if (attendance.status === 'present') {
      return `${formatActualTime(
        attendance.check_in_at,
      )} -`
    }

    if (attendance.status === 'deferred') {
      return '유예등교'
    }

    if (attendance.status === 'absent') {
      return '결석'
    }

    if (attendance.status === 'completed') {
      return `${formatActualTime(
        attendance.check_in_at,
      )} - ${formatActualTime(
        attendance.check_out_at,
      )}`
    }

    return ''
  }

  const handleAttendance = async (status) => {
    if (!selectedClass) {
      return
    }

    setIsSubmitting(true)

    const {
      error: attendanceError,
    } = await supabase.rpc(
      'set_attendance_status',
      {
        p_class_schedule_id: selectedClass.id,
        p_attendance_date: today,
        p_status: status,
      },
    )

    setIsSubmitting(false)

    if (attendanceError) {
      console.error(attendanceError)

      alert(
        attendanceError.message ||
          '출석 처리에 실패했습니다.',
      )

      return
    }

    setSelectedClass(null)
    await refetch()
  }

  const activeStudents = students.filter(
    (student) => student.status === 'active',
  )

  return (
    <>
      <AppHeader />

      <main
        style={{
          width:
            'min(1400px, calc(100% - 40px))',
          margin: '0 auto',
          padding: '28px 0 50px',
        }}
      >
        <div
          style={{
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                marginBottom: '6px',
              }}
            >
              대시보드
            </h1>

            <p
              style={{
                margin: 0,
                color: '#6b7280',
              }}
            >
              오늘 학생과 학원 일정을 한눈에
              확인하세요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsWeekEditorOpen(true)}
            style={{
              background: '#4f46e5',
            }}
          >
            한 주 수정
          </button>
        </div>

        {/* 위쪽 카드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(260px, 1fr) minmax(320px, 1.3fr)',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          {/* 학생 */}
          <section className="card">
            <h2
              style={{
                marginTop: 0,
              }}
            >
              학생
            </h2>

            {studentsLoading ? (
              <LoadingState />
            ) : activeStudents.length === 0 ? (
              <EmptyState message="재원 학생이 없습니다." />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gap: '8px',
                }}
              >
                {activeStudents.map(
                  (student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/students/${student.id}`,
                        )
                      }
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px',
                        border:
                          '1px solid #e5e7eb',
                        borderRadius: '10px',
                        color: '#111827',
                        background: '#f9fafb',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <strong>
                        {student.name}
                      </strong>

                      <div
                        style={{
                          marginTop: '3px',
                          color: '#6b7280',
                          fontSize: '13px',
                        }}
                      >
                        {student.school}{' '}
                        {student.grade}
                      </div>
                    </button>
                  ),
                )}
              </div>
            )}
          </section>

          {/* 출석 */}
          <section className="card">
            <h2
              style={{
                marginTop: 0,
              }}
            >
              오늘 출석
            </h2>

            {attendanceLoading ? (
              <LoadingState message="오늘 수업을 불러오는 중..." />
            ) : error ? (
              <ErrorState message="출석 목록을 불러오지 못했습니다." />
            ) : classes.length === 0 ? (
              <EmptyState message="오늘 담당 수업이 없습니다." />
            ) : (
              classes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setSelectedClass(item)
                  }
                  style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    padding: '13px 15px',
                    marginBottom: '8px',
                    background: 'white',
                    color: '#111827',
                    border:
                      '1px solid #e5e7eb',
                    borderLeft: `6px solid ${getStatusColor(
                      item.attendance,
                    )}`,
                    borderRadius: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <strong>
                    {item.student?.name}
                  </strong>

                  <span
                    style={{
                      color: '#6b7280',
                    }}
                  >
                    {getAttendanceText(item)}
                  </span>
                </button>
              ))
            )}
          </section>
        </div>

        {/* 캘린더 */}
        <section
          style={{
            marginBottom: '20px',
          }}
        >
          <CalendarPanel
            students={students}
            refreshKey={calendarRefreshKey}
            onDataChanged={() =>
              setCalendarRefreshKey(
                (current) => current + 1,
              )
            }
          />
        </section>

        {/* 아래쪽 정보 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
          }}
        >
          <section className="card">
            <TodayMemoPanel
              students={students}
              refreshKey={calendarRefreshKey}
            />
          </section>

          <section className="card">
            <ExamSchedulePanel
              onDataChanged={() =>
                setCalendarRefreshKey(
                  (current) => current + 1,
                )
              }
            />
          </section>
        </div>
      </main>


      {isWeekEditorOpen && (
        <WeekScheduleEditor
          students={students}
          onClose={() => setIsWeekEditorOpen(false)}
          onSaved={async () => {
            await refetch()
            setCalendarRefreshKey(
              (current) => current + 1,
            )
          }}
        />
      )}

      {selectedClass && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(17, 24, 39, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 999,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              background: 'white',
              borderRadius: '16px',
              padding: '25px',
              boxShadow:
                '0 20px 50px rgba(0,0,0,0.2)',
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              {selectedClass.student?.name}
            </h2>

            <p>
              {selectedClass.student?.school}{' '}
              {selectedClass.student?.grade}
            </p>

            <p>
              예정시간:{' '}
              {formatScheduleTime(
                selectedClass.start_time,
              )}
              {' - '}
              {formatScheduleTime(
                selectedClass.end_time,
              )}
            </p>

            {!selectedClass.attendance && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    handleAttendance('present')
                  }
                  style={{
                    background: '#10b981',
                  }}
                >
                  등교
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    handleAttendance('deferred')
                  }
                  style={{
                    background: '#10b981',
                  }}
                >
                  유예등교
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    handleAttendance('absent')
                  }
                  style={{
                    background: '#ef4444',
                  }}
                >
                  결석
                </button>
              </div>
            )}

            {selectedClass.attendance?.status ===
              'present' && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() =>
                  handleAttendance('completed')
                }
              >
                하원
              </button>
            )}

            {selectedClass.attendance?.status ===
              'deferred' && (
              <p>
                유예등교 처리된 학생입니다.
              </p>
            )}

            {selectedClass.attendance?.status ===
              'absent' && (
              <p>결석 처리된 학생입니다.</p>
            )}

            {selectedClass.attendance?.status ===
              'completed' && (
              <p>하원까지 완료되었습니다.</p>
            )}

            <hr />

            <button
              type="button"
              onClick={() =>
                setSelectedClass(null)
              }
              style={{
                background: '#6b7280',
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default DashboardPage