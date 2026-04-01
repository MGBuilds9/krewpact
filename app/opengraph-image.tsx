import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'KrewPact — Construction Operations Platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #1a1510 0%, #2d2318 50%, #1a1510 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            background: '#f5a623',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            fontWeight: 700,
            color: '#1a1510',
          }}
        >
          K
        </div>
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: 12,
        }}
      >
        KrewPact
      </div>
      <div
        style={{
          fontSize: 24,
          color: '#f5a623',
          letterSpacing: 2,
        }}
      >
        CONSTRUCTION OPERATIONS PLATFORM
      </div>
    </div>,
    { ...size },
  );
}
