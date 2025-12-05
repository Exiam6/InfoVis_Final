import './globals.css';

export const metadata = {
  title: 'AI Research Visualization | Global Trends 2010-2025',
  description: 'Interactive visualization of AI research paper distribution and trends across countries and subfields',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-viz-bg text-viz-text antialiased">
        {children}
      </body>
    </html>
  );
}