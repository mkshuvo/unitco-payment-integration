export default function Head() {
  return (
    <>
      <meta
        httpEquiv="Content-Security-Policy"
        content="connect-src 'self' https://*.s.unit.sh https://*.zdassets.com https://*.zendesk.com https://cdn.plaid.com; script-src 'self' https://*.s.unit.sh https://*.zdassets.com https://*.zendesk.com https://cdn.plaid.com; frame-src 'self' https://*.zendesk.com https://cdn.plaid.com;"
      />
    </>
  );
}
