import TopBar from './TopBar';

export default function PageWrapper({ title, children }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <TopBar title={title} />
      <main className="flex-1 overflow-y-auto p-5 bg-bg">
        {children}
      </main>
    </div>
  );
}
