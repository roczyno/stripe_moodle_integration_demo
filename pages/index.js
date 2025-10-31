import dynamic from 'next/dynamic';

const Plans = dynamic(() => import('../components/Plans'), { ssr: false });

export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, Arial, sans-serif' }}>
      <Plans />
    </main>
  );
}


