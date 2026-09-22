import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function getTodayString() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function useTodayAttendance() {
  const { user } = useAuth()

  const [classes, setClasses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTodayClasses = async () => {
    if (!user) {
      setClasses([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const today = getTodayString()

    const {
      data: schedules,
      error: scheduleError,
    } = await supabase.rpc(
      'get_effective_today_schedule',
      {
        p_date: today,
      },
    )

    if (scheduleError) {
      console.error(scheduleError)
      setError(scheduleError.message)
      setClasses([])
      setIsLoading(false)
      return
    }

    if (!schedules || schedules.length === 0) {
      setClasses([])
      setIsLoading(false)
      return
    }

    const scheduleIds = schedules.map(
      (schedule) => schedule.schedule_id,
    )

    const { data: attendance, error: attendanceError } =
      await supabase
        .from('attendance')
        .select(
          'id, class_schedule_id, status, check_in_at, check_out_at',
        )
        .in('class_schedule_id', scheduleIds)
        .eq('attendance_date', today)

    if (attendanceError) {
      console.error(attendanceError)
      setError(attendanceError.message)
      setClasses([])
      setIsLoading(false)
      return
    }

    const merged = schedules.map((schedule) => {
      const attendanceRecord = (attendance ?? []).find(
        (item) =>
          item.class_schedule_id ===
          schedule.schedule_id,
      )

      return {
        id: schedule.schedule_id,
        student_id: schedule.student_id,
        teacher_id: schedule.teacher_id,
        weekday: new Date(
          `${today}T00:00:00`,
        ).getDay(),
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        student: {
          id: schedule.student_id,
          name: schedule.student_name,
          school: schedule.school,
          grade: schedule.grade,
          status: schedule.student_status,
        },
        attendance: attendanceRecord ?? null,
      }
    })

    setClasses(merged)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchTodayClasses()
  }, [user])

  return {
    classes,
    isLoading,
    error,
    refetch: fetchTodayClasses,
    today: getTodayString(),
  }
}

export default useTodayAttendance
