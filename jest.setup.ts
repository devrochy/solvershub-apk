// Los matchers de @testing-library/react-native v14 son built-in; no se
// necesita extend-expect. Este archivo queda como punto de extensión.

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Icono = (props: { name: string }) =>
    React.createElement(Text, { testID: `icono-${props.name}` }, props.name);
  return { MaterialIcons: Icono };
});

jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    WebView: React.forwardRef(
      (props: Record<string, unknown>, ref: { current: unknown } | null) => {
        React.useImperativeHandle(ref, () => ({ injectJavaScript: jest.fn() }));
        return React.createElement(View, props);
      },
    ),
  };
});

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children, ...rest }: Record<string, unknown>) =>
      React.createElement(View, rest, children),
    useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
  };
});

export {};