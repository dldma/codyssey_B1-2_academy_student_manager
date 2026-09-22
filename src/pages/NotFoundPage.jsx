import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#f5f7fb',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '48px 36px',
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow:
            '0 12px 35px rgba(15, 23, 42, 0.08)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            marginBottom: '8px',
            fontSize: '72px',
            fontWeight: '800',
            color: '#5b4ce2',
            lineHeight: 1,
          }}
        >
          404
        </div>

        <h1
          style={{
            margin: '20px 0 10px',
            color: '#111827',
          }}
        >
          페이지를 찾을 수 없습니다
        </h1>

        <p
          style={{
            margin: '0 0 30px',
            color: '#6b7280',
            lineHeight: 1.7,
          }}
        >
          입력한 주소가 잘못되었거나
          존재하지 않는 페이지입니다.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/login"
            style={{
              padding: '11px 18px',
              borderRadius: '10px',
              background: '#5b4ce2',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: '700',
            }}
          >
            로그인으로
          </Link>

          <Link
            to="/dashboard"
            style={{
              padding: '11px 18px',
              borderRadius: '10px',
              background: '#eef2ff',
              color: '#4338ca',
              textDecoration: 'none',
              fontWeight: '700',
            }}
          >
            대시보드로
          </Link>
        </div>
      </section>
    </main>
  )
}

export default NotFoundPage