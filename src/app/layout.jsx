'./globals.css';
import './globals.css';

export const metadata = {
  title: 'Mahjong Score',
  description: 'Score entry page',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
