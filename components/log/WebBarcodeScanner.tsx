// Native stub. The real implementation lives in WebBarcodeScanner.web.tsx
// and is selected by Metro on the web platform target. Native code never
// renders this component, but keeping a same-named file here keeps imports
// resolvable during native typecheck/bundle.
import { View } from 'react-native';

export function WebBarcodeScanner(_props: { onScan: (raw: string) => void }) {
  return <View />;
}
