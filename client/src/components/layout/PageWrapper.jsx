import TopBar from './TopBar';

export default function PageWrapper({ title, children }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <TopBar title={title} />
      <main className="flex-1 overflow-auto p-5">
        {children}
      </main>
    </div>
  );
}
