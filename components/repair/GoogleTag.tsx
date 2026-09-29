import Script from "next/script"

// The Google tag (gtag.js) for the repair landing pages — and only there.
// Loads nothing unless NEXT_PUBLIC_GOOGLE_ADS_ID (e.g. AW-123456789) is set at
// build time. No Google tag exists on straightshotoverhead.com or on this app
// today (checked 2026-09-28), so this cannot double-fire an existing one; if a
// Tag Manager container is added later, remove this and fire from GTM instead.
export default function GoogleTag() {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
  if (!id || !/^AW-\d{6,12}$/.test(id)) return null
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-ads-tag" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  )
}
