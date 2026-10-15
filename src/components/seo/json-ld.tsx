import React from "react";

export function WebSiteJsonLd({
  siteUrl,
  siteName,
  searchUrl,
}: {
  siteUrl: string;
  siteName: string;
  searchUrl?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    ...(searchUrl
      ? {
          potentialAction: {
            "@type": "SearchAction",
            target: `${searchUrl}{search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd({
  name,
  url,
  logo,
  contactPhone,
  contactWhatsapp,
  address,
}: {
  name: string;
  url: string;
  logo?: string | null;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  address?: string | null;
}) {
  const contactPoints = [];
  if (contactPhone) {
    contactPoints.push({
      "@type": "ContactPoint",
      telephone: contactPhone,
      contactType: "customer service",
      availableLanguage: ["id", "en"],
    });
  }
  if (contactWhatsapp) {
    contactPoints.push({
      "@type": "ContactPoint",
      telephone: `+${contactWhatsapp.replace(/\D/g, "")}`,
      contactType: "WhatsApp Support",
      availableLanguage: ["id", "en"],
    });
  }

  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    ...(logo ? { logo } : {}),
    ...(address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: address,
            addressCountry: "ID",
          },
        }
      : {}),
    ...(contactPoints.length > 0 ? { contactPoint: contactPoints } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  images,
  price,
  currency = "IDR",
  url,
  category,
  brandName = "Undangan.id",
}: {
  name: string;
  description: string;
  images: string[];
  price: number;
  currency?: string;
  url: string;
  category?: string;
  brandName?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: images.length > 0 ? images : undefined,
    category,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: currency,
      price: price,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function LocalBusinessJsonLd({
  name,
  description,
  url,
  image,
  telephone,
  address,
}: {
  name: string;
  description?: string | null;
  url: string;
  image?: string | null;
  telephone?: string | null;
  address?: string | null;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name,
    description: description || undefined,
    url,
    ...(image ? { image } : {}),
    ...(telephone ? { telephone } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: address || "Indonesia",
      addressCountry: "ID",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
