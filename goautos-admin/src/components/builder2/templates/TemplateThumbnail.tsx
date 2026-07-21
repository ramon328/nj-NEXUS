import React from 'react';

interface TemplateThumbnailProps {
  templateId: string;
}

/**
 * Visual SVG-based previews for each template.
 * Cada thumbnail es una mini-representación visual real de cómo se ve la plantilla.
 */
export const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({ templateId }) => {
  switch (templateId) {
    case 'moderna':
      return (
        <svg viewBox="0 0 280 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Hero with gradient */}
          <rect width="280" height="100" fill="#f8fafc" />
          <rect x="60" y="25" width="160" height="10" rx="2" fill="#1e293b" />
          <rect x="80" y="42" width="120" height="6" rx="2" fill="#94a3b8" />
          <rect x="105" y="58" width="32" height="14" rx="4" fill="#3b82f6" />
          <rect x="143" y="58" width="32" height="14" rx="4" fill="none" stroke="#3b82f6" strokeWidth="1" />

          {/* Vehicle cards */}
          <rect y="106" width="280" height="100" fill="#ffffff" />
          <rect x="50" y="110" width="180" height="8" rx="2" fill="#1e293b" />
          <rect x="16" y="126" width="76" height="70" rx="6" fill="#f1f5f9" />
          <rect x="22" y="132" width="64" height="36" rx="4" fill="#e2e8f0" />
          <rect x="22" y="174" width="40" height="4" rx="1" fill="#334155" />
          <rect x="22" y="182" width="28" height="4" rx="1" fill="#3b82f6" />
          <rect x="102" y="126" width="76" height="70" rx="6" fill="#f1f5f9" />
          <rect x="108" y="132" width="64" height="36" rx="4" fill="#e2e8f0" />
          <rect x="108" y="174" width="40" height="4" rx="1" fill="#334155" />
          <rect x="108" y="182" width="28" height="4" rx="1" fill="#3b82f6" />
          <rect x="188" y="126" width="76" height="70" rx="6" fill="#f1f5f9" />
          <rect x="194" y="132" width="64" height="36" rx="4" fill="#e2e8f0" />
          <rect x="194" y="174" width="40" height="4" rx="1" fill="#334155" />
          <rect x="194" y="182" width="28" height="4" rx="1" fill="#3b82f6" />

          {/* Stats counter */}
          <rect y="212" width="280" height="50" fill="#f8fafc" />
          <rect x="24" y="224" width="30" height="10" rx="2" fill="#3b82f6" />
          <rect x="24" y="238" width="40" height="4" rx="1" fill="#94a3b8" />
          <rect x="94" y="224" width="30" height="10" rx="2" fill="#3b82f6" />
          <rect x="94" y="238" width="40" height="4" rx="1" fill="#94a3b8" />
          <rect x="164" y="224" width="30" height="10" rx="2" fill="#3b82f6" />
          <rect x="164" y="238" width="40" height="4" rx="1" fill="#94a3b8" />
          <rect x="234" y="224" width="30" height="10" rx="2" fill="#3b82f6" />
          <rect x="234" y="238" width="40" height="4" rx="1" fill="#94a3b8" />

          {/* Testimonials */}
          <rect y="268" width="280" height="70" fill="#ffffff" />
          <rect x="80" y="274" width="120" height="8" rx="2" fill="#1e293b" />
          <rect x="16" y="290" width="120" height="40" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="144" y="290" width="120" height="40" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />

          {/* CTA */}
          <rect y="344" width="280" height="30" fill="#f8fafc" />
          <rect x="70" y="352" width="140" height="6" rx="2" fill="#1e293b" />
          <rect x="110" y="362" width="60" height="8" rx="3" fill="#3b82f6" />

          {/* Footer */}
          <rect y="378" width="280" height="22" fill="#111827" />
          <rect x="16" y="384" width="50" height="4" rx="1" fill="#6b7280" />
          <rect x="80" y="384" width="30" height="4" rx="1" fill="#4b5563" />
          <rect x="120" y="384" width="30" height="4" rx="1" fill="#4b5563" />
          <rect x="160" y="384" width="30" height="4" rx="1" fill="#4b5563" />
        </svg>
      );

    case 'premium':
      return (
        <svg viewBox="0 0 280 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Hero with dark overlay + logo */}
          <rect width="280" height="110" fill="#0f172a" />
          <rect x="100" y="20" width="80" height="24" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <circle cx="116" cy="32" r="8" fill="#3b82f6" opacity="0.6" />
          <rect x="128" y="28" width="40" height="8" rx="2" fill="#e2e8f0" />
          <rect x="70" y="55" width="140" height="8" rx="2" fill="#ffffff" opacity="0.9" />
          <rect x="90" y="70" width="100" height="5" rx="2" fill="#94a3b8" opacity="0.6" />
          <rect x="108" y="85" width="64" height="14" rx="4" fill="#3b82f6" />

          {/* Vehicle carousel */}
          <rect y="116" width="280" height="90" fill="#ffffff" />
          <rect x="16" y="122" width="100" height="6" rx="2" fill="#1e293b" />
          <rect x="16" y="136" width="80" height="62" rx="8" fill="#f1f5f9" />
          <rect x="22" y="142" width="68" height="34" rx="4" fill="#e2e8f0" />
          <rect x="22" y="182" width="36" height="4" rx="1" fill="#334155" />
          <rect x="22" y="190" width="24" height="3" rx="1" fill="#3b82f6" />
          <rect x="104" y="136" width="80" height="62" rx="8" fill="#f1f5f9" />
          <rect x="110" y="142" width="68" height="34" rx="4" fill="#e2e8f0" />
          <rect x="110" y="182" width="36" height="4" rx="1" fill="#334155" />
          <rect x="110" y="190" width="24" height="3" rx="1" fill="#3b82f6" />
          <rect x="192" y="136" width="80" height="62" rx="8" fill="#f1f5f9" />
          <rect x="198" y="142" width="68" height="34" rx="4" fill="#e2e8f0" />
          <rect x="198" y="182" width="36" height="4" rx="1" fill="#334155" />
          <rect x="198" y="190" width="24" height="3" rx="1" fill="#3b82f6" />

          {/* Why choose us cards */}
          <rect y="212" width="280" height="70" fill="#f8fafc" />
          <rect x="80" y="218" width="120" height="7" rx="2" fill="#1e293b" />
          <rect x="16" y="232" width="76" height="42" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="54" cy="244" r="8" fill="#eff6ff" />
          <rect x="36" y="258" width="36" height="4" rx="1" fill="#334155" />
          <rect x="30" y="266" width="48" height="3" rx="1" fill="#94a3b8" />
          <rect x="102" y="232" width="76" height="42" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="140" cy="244" r="8" fill="#eff6ff" />
          <rect x="122" y="258" width="36" height="4" rx="1" fill="#334155" />
          <rect x="116" y="266" width="48" height="3" rx="1" fill="#94a3b8" />
          <rect x="188" y="232" width="76" height="42" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="226" cy="244" r="8" fill="#eff6ff" />
          <rect x="208" y="258" width="36" height="4" rx="1" fill="#334155" />
          <rect x="202" y="266" width="48" height="3" rx="1" fill="#94a3b8" />

          {/* Team */}
          <rect y="288" width="280" height="60" fill="#ffffff" />
          <rect x="90" y="294" width="100" height="6" rx="2" fill="#1e293b" />
          <circle cx="60" cy="322" r="14" fill="#f1f5f9" />
          <rect x="40" y="340" width="40" height="3" rx="1" fill="#334155" />
          <circle cx="140" cy="322" r="14" fill="#f1f5f9" />
          <rect x="120" y="340" width="40" height="3" rx="1" fill="#334155" />
          <circle cx="220" cy="322" r="14" fill="#f1f5f9" />
          <rect x="200" y="340" width="40" height="3" rx="1" fill="#334155" />

          {/* FAQ */}
          <rect y="354" width="280" height="24" fill="#f8fafc" />
          <rect x="90" y="358" width="100" height="5" rx="2" fill="#1e293b" />
          <rect x="40" y="366" width="200" height="4" rx="2" fill="#e2e8f0" />
          <rect x="40" y="372" width="200" height="4" rx="2" fill="#e2e8f0" />

          {/* Footer */}
          <rect y="378" width="280" height="22" fill="#111827" />
          <rect x="16" y="384" width="50" height="4" rx="1" fill="#6b7280" />
          <rect x="80" y="384" width="30" height="4" rx="1" fill="#4b5563" />
          <rect x="160" y="384" width="30" height="4" rx="1" fill="#4b5563" />
        </svg>
      );

    case 'minimalista':
      return (
        <svg viewBox="0 0 280 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Minimalistic hero - split layout */}
          <rect width="280" height="110" fill="#ffffff" />
          <rect x="16" y="25" width="120" height="12" rx="2" fill="#111827" />
          <rect x="16" y="44" width="100" height="5" rx="2" fill="#6b7280" />
          <rect x="16" y="54" width="80" height="5" rx="2" fill="#6b7280" />
          <rect x="16" y="70" width="50" height="14" rx="4" fill="#111827" />
          <rect x="72" y="70" width="50" height="14" rx="4" fill="none" stroke="#111827" strokeWidth="1" />
          <rect x="180" y="20" width="84" height="80" rx="8" fill="#f1f5f9" />

          {/* Clean vehicle grid */}
          <rect y="116" width="280" height="120" fill="#fafafa" />
          <rect x="90" y="122" width="100" height="8" rx="2" fill="#111827" />
          <rect x="16" y="140" width="120" height="86" rx="8" fill="#ffffff" stroke="#f1f5f9" strokeWidth="2" />
          <rect x="22" y="146" width="108" height="48" rx="4" fill="#f1f5f9" />
          <rect x="22" y="200" width="60" height="5" rx="1" fill="#334155" />
          <rect x="22" y="210" width="36" height="5" rx="1" fill="#111827" />
          <rect x="144" y="140" width="120" height="86" rx="8" fill="#ffffff" stroke="#f1f5f9" strokeWidth="2" />
          <rect x="150" y="146" width="108" height="48" rx="4" fill="#f1f5f9" />
          <rect x="150" y="200" width="60" height="5" rx="1" fill="#334155" />
          <rect x="150" y="210" width="36" height="5" rx="1" fill="#111827" />

          {/* Testimonials - minimal style */}
          <rect y="242" width="280" height="90" fill="#ffffff" />
          <rect x="90" y="248" width="100" height="7" rx="2" fill="#111827" />
          <rect x="16" y="264" width="120" height="58" rx="8" fill="#fafafa" />
          <rect x="26" y="270" width="10" height="8" rx="1" fill="#e2e8f0" />
          <rect x="26" y="282" width="100" height="3" rx="1" fill="#6b7280" />
          <rect x="26" y="288" width="80" height="3" rx="1" fill="#6b7280" />
          <rect x="26" y="294" width="90" height="3" rx="1" fill="#6b7280" />
          <circle cx="38" cy="310" r="7" fill="#e2e8f0" />
          <rect x="50" y="306" width="40" height="3" rx="1" fill="#334155" />
          <rect x="50" y="312" width="30" height="3" rx="1" fill="#94a3b8" />
          <rect x="144" y="264" width="120" height="58" rx="8" fill="#fafafa" />
          <rect x="154" y="270" width="10" height="8" rx="1" fill="#e2e8f0" />
          <rect x="154" y="282" width="100" height="3" rx="1" fill="#6b7280" />
          <rect x="154" y="288" width="80" height="3" rx="1" fill="#6b7280" />
          <rect x="154" y="294" width="90" height="3" rx="1" fill="#6b7280" />
          <circle cx="166" cy="310" r="7" fill="#e2e8f0" />
          <rect x="178" y="306" width="40" height="3" rx="1" fill="#334155" />
          <rect x="178" y="312" width="30" height="3" rx="1" fill="#94a3b8" />

          {/* CTA - clean */}
          <rect y="338" width="280" height="62" fill="#fafafa" />
          <rect x="60" y="352" width="160" height="8" rx="2" fill="#111827" />
          <rect x="80" y="366" width="120" height="5" rx="2" fill="#94a3b8" />
          <rect x="100" y="382" width="80" height="12" rx="4" fill="#111827" />
        </svg>
      );

    case 'tradicional':
    default:
      return (
        <svg viewBox="0 0 280 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Welcome hero with search */}
          <rect width="280" height="100" fill="#ffffff" />
          <rect x="50" y="18" width="180" height="10" rx="2" fill="#111827" />
          <rect x="70" y="35" width="140" height="5" rx="2" fill="#6b7280" />
          <rect x="40" y="52" width="200" height="24" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="52" y="60" width="100" height="6" rx="2" fill="#d1d5db" />
          <rect x="200" y="56" width="30" height="14" rx="4" fill="#3b82f6" />
          <rect x="100" y="82" width="80" height="4" rx="1" fill="#94a3b8" />

          {/* Vehicle grid - traditional */}
          <rect y="106" width="280" height="110" fill="#f9fafb" />
          <rect x="16" y="114" width="76" height="90" rx="6" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
          <rect x="20" y="118" width="68" height="40" rx="3" fill="#f1f5f9" />
          <rect x="20" y="164" width="50" height="4" rx="1" fill="#334155" />
          <rect x="20" y="174" width="30" height="5" rx="1" fill="#3b82f6" />
          <rect x="20" y="188" width="68" height="8" rx="3" fill="#3b82f6" opacity="0.15" />
          <rect x="102" y="114" width="76" height="90" rx="6" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
          <rect x="106" y="118" width="68" height="40" rx="3" fill="#f1f5f9" />
          <rect x="106" y="164" width="50" height="4" rx="1" fill="#334155" />
          <rect x="106" y="174" width="30" height="5" rx="1" fill="#3b82f6" />
          <rect x="106" y="188" width="68" height="8" rx="3" fill="#3b82f6" opacity="0.15" />
          <rect x="188" y="114" width="76" height="90" rx="6" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
          <rect x="192" y="118" width="68" height="40" rx="3" fill="#f1f5f9" />
          <rect x="192" y="164" width="50" height="4" rx="1" fill="#334155" />
          <rect x="192" y="174" width="30" height="5" rx="1" fill="#3b82f6" />
          <rect x="192" y="188" width="68" height="8" rx="3" fill="#3b82f6" opacity="0.15" />

          {/* Map section */}
          <rect y="222" width="280" height="70" fill="#ffffff" />
          <rect x="90" y="228" width="100" height="6" rx="2" fill="#111827" />
          <rect x="16" y="240" width="90" height="44" rx="6" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="24" y="250" width="60" height="3" rx="1" fill="#94a3b8" />
          <rect x="24" y="258" width="40" height="3" rx="1" fill="#94a3b8" />
          <rect x="24" y="268" width="70" height="8" rx="3" fill="#3b82f6" />
          <rect x="114" y="240" width="150" height="44" rx="6" fill="#e5e7eb" />
          <circle cx="189" cy="262" r="6" fill="#3b82f6" opacity="0.4" />

          {/* Why choose us */}
          <rect y="298" width="280" height="55" fill="#f9fafb" />
          <rect x="70" y="304" width="140" height="6" rx="2" fill="#111827" />
          <rect x="16" y="316" width="76" height="30" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="54" cy="326" r="5" fill="#eff6ff" />
          <rect x="36" y="336" width="36" height="3" rx="1" fill="#334155" />
          <rect x="102" y="316" width="76" height="30" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="140" cy="326" r="5" fill="#eff6ff" />
          <rect x="122" y="336" width="36" height="3" rx="1" fill="#334155" />
          <rect x="188" y="316" width="76" height="30" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="226" cy="326" r="5" fill="#eff6ff" />
          <rect x="208" y="336" width="36" height="3" rx="1" fill="#334155" />

          {/* Contact CTA */}
          <rect y="359" width="280" height="41" fill="#ffffff" />
          <rect x="50" y="367" width="180" height="7" rx="2" fill="#111827" />
          <rect x="100" y="380" width="80" height="12" rx="4" fill="#3b82f6" />
        </svg>
      );
  }
};
