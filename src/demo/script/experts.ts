import type { Expert } from "../domain/types";

/** Seeded experts who show why matching picks Margaret (one competency gap, one price gap). */
export const OTHER_EXPERTS: readonly Expert[] = [
  {
    id: "harold",
    name: "Harold Brooks",
    age: 71,
    headline: "Retired hospital operations manager",
    yearsExperience: 30,
    location: "Phoenix, Arizona",
    competencies: [
      { id: "h1", tag: "hospital-operations", label: "Hospital operations", description: "Running wards and clinics day to day.", source: { kind: "interview", turn: 2 } },
      { id: "h2", tag: "staff-scheduling", label: "Staff scheduling", description: "Shift planning for large teams.", source: { kind: "interview", turn: 4 } },
      { id: "h3", tag: "vendor-management", label: "Vendor management", description: "Managing service contracts for facilities.", source: { kind: "interview", turn: 6 } },
    ],
    exampleProblems: ["Planning staff rotas", "Opening a new clinic"],
    priceRange: { min: 40, max: 60 },
    published: true,
    credentialsSelfDeclared: true,
  },
  {
    id: "lin",
    name: "Lin Zhao",
    age: 66,
    headline: "Retired supply-chain vice president",
    yearsExperience: 38,
    location: "Vancouver, Canada",
    competencies: [
      { id: "l1", tag: "contract-manufacturing", label: "Contract manufacturing scale-up", description: "Scaling production with contract manufacturers in Asia.", source: { kind: "interview", turn: 3 } },
      { id: "l2", tag: "logistics", label: "Global logistics", description: "Freight, customs and warehousing.", source: { kind: "interview", turn: 5 } },
      { id: "l3", tag: "supplier-negotiation", label: "Supplier negotiation", description: "Multi-year supply agreements.", source: { kind: "document", name: "Lin Zhao CV.pdf" } },
    ],
    exampleProblems: ["Moving production between countries", "Setting up a second source"],
    priceRange: { min: 120, max: 160 },
    published: true,
    credentialsSelfDeclared: true,
  },
];
