'./globals.css';
import './globals.css';

export const metadata = {
  title: 'Mahjong Score',
  description: 'Score entry page',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Song+Myung&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
