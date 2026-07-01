'use client';

export default function OfflinePage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Offline — Recipe De-Bloater</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', system-ui, sans-serif;
            background: #080c14;
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 24px;
          }
          .emoji { font-size: 72px; margin-bottom: 24px; display: block; }
          h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #f97316, #ef4444);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          p { color: #94a3b8; font-size: 16px; line-height: 1.7; max-width: 360px; margin: 0 auto 32px; }
          button {
            background: linear-gradient(135deg, #f97316, #ef4444);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
          }
        `}</style>
      </head>
      <body>
        <div>
          <span className="emoji">📡</span>
          <h1>You&apos;re offline</h1>
          <p>
            Recipe De-Bloater needs a connection to extract new recipes.
            Check your internet and try again.
          </p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
