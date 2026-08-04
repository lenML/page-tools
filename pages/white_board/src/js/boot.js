function App() {
      const view = useStore(s => s.view);
      if (view === 'board-list') return <BoardListPage />;
      return <CanvasView />;
    }

    createRoot(document.getElementById("root")).render(<App />);
