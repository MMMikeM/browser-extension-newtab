// Minimal WebExtension API types for background script + extension pages
declare namespace browser {
  namespace alarms {
    interface Alarm {
      name: string;
    }
    function create(name: string, info: { periodInMinutes?: number; when?: number }): void;
    const onAlarm: {
      addListener(cb: (alarm: Alarm) => void): void;
    };
  }
  namespace runtime {
    function sendMessage(message: unknown): Promise<unknown>;
    const onMessage: {
      addListener(cb: (message: unknown) => void): void;
      removeListener(cb: (message: unknown) => void): void;
    };
  }
  namespace storage {
    namespace local {
      function get(key: string): Promise<Record<string, string>>;
      function set(items: Record<string, string>): Promise<void>;
      function remove(key: string): Promise<void>;
    }
  }
}
