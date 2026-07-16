import Script from "next/script";

/**
 * Google Tag Manager. Renders nothing unless NEXT_PUBLIC_GTM_ID is set
 * (a container id like "GTM-XXXXXXX"). Mirrors the manual, env-gated pattern
 * used by GoogleAnalytics. GTM and the direct GA4 integration are independent —
 * set either or both. If you manage GA4 *inside* GTM, leave NEXT_PUBLIC_GA4_ID
 * unset so events aren't double-counted.
 *
 * Render this as the FIRST child of <body> so the <noscript> fallback sits
 * immediately after the opening body tag, per Google's install guidance.
 */
export function GoogleTagManager() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  if (!gtmId) return null;

  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
      </Script>
      <noscript>
        <iframe
          title="Google Tag Manager"
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
