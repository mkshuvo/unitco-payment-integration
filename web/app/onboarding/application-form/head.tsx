export default function Head() {
  return (
    <>
      <meta
        httpEquiv="Content-Security-Policy"
        content="connect-src 'self' http://localhost:41873 https://*.s.unit.sh; script-src 'self' https://*.s.unit.sh; frame-src 'self' https://*.s.unit.sh;"
      />
    </>
  );
}
