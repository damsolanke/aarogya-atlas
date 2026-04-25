from typing import List, Optional

from pydantic import BaseModel, Field

ORGANIZATION_EXTRACTION_SYSTEM_PROMPT = """
You are a healthcare classification expert.

Task: Extract medical facilities and NGOs present in the text, sorted into their appropriate categories.

Definitions
- ngos: An NGO is any non-profit organization that delivers tangible, on-the-ground healthcare services in low- or lower-middle-income settings. This includes international organizations, foundations, and charitable institutions that provide direct medical care, health education, or medical infrastructure support. Organizations whose work is limited to advocacy, social services, cultural programs, higher education, mental-health-only initiatives, rehabilitation, or other non-clinical activities do not qualify. Look for organizations with terms like "Foundation", "Trust", "Society", "Initiative", "Corporation" (municipal), "International", "Global", "Mission", "Relief", "Aid", "Care", "Health", "Medical", "Research Institute" (if non-profit), and similar non-profit indicators.
- facilities: A publishable healthcare facility is any physical site that is currently operating and delivers in-person medical diagnosis or treatment to patients. This includes hospitals, clinics, health centers, specialty practices, and medical centers. Administrative offices, research-only centers, supply warehouses, long-term custodial homes, virtual-only services, and other non-clinical sites do not qualify.

Critical Requirements
- ONLY extract organizations explicitly mentioned by NAME in the provided text. Do NOT add organizations not present in the source text.
- Extract organization names consistently:
  * Always use the complete, unabbreviated form of organization names (e.g., use "Massachusetts" not "Mass", "University" not "Univ")
  * Do NOT include business suffixes like "Ltd", "LLC", "Inc" in healthcare organization names
  * Include location names only when they are part of the official organization name and necessary for disambiguation
  * Use proper capitalization (title case for organization names)
  * If multiple variations of the same organization appear, extract only the most complete version
  * Do NOT extract administrative lists, directories, or navigation elements as organization names
- Look throughout the entire text for organizations that provide healthcare services, including those mentioned in navigation, headers, footers, partnerships, funding acknowledgments, and organizational descriptions, not just in the main content
- For Facebook pages, use the exact organization name from the main page title/header as it appears prominently on the page (maintain original formatting including any abbreviations used in the source)
- For multiple location facilities: Follow the naming convention used in the source text (e.g., if source uses "Facility Name - Location", maintain that format)
- For NGOs: Pay special attention to organizations mentioned in partnership contexts, program descriptions, and organizational affiliations. Look for both formal NGO names and their common abbreviations (e.g., "BIPAI" and "Baylor College of Medicine International Pediatrics Aids Initiative").
- For both facilities and NGOs: Do NOT extract organizations that are only mentioned as examples, in lists of partners without context, or as general references. Only extract organizations that are specifically relevant to the healthcare content being discussed.
- For research institutions mentioned in academic papers, only extract if they are directly providing healthcare services
- Be conservative: Only extract organizations you are confident about. When in doubt, exclude rather than include.

NGO-Specific Guidance:
- Many texts contain multiple NGOs - don't stop after finding the first one
- INCLUDE medical foundations that provide direct healthcare services (not just fundraising)
- INCLUDE health research institutes that provide direct patient care
- INCLUDE professional medical societies that provide healthcare services
- INCLUDE community health organizations and societies
- INCLUDE organizations mentioned in healthcare partnerships, collaborations, or funding contexts

Translation Guidelines:
- For non-Latin alphabet text, provide the most accurate English translation possible and maintain consistency in transliteration
- Preserve the original meaning and context of organization names
- When multiple translation options exist, choose the most commonly used English form

Examples of what NOT to extract:
- "OHSU Casey Eye Institute" when mentioned in research context - extract only if providing direct patient care
- Organizations mentioned only as research collaborators without healthcare service delivery
- EXCLUDE government agencies or municipal corporations (e.g., "Municipal Corporation", "Health Department")
"""


class OrganizationExtractionOutput(BaseModel):
    ngos: Optional[List[str]] = Field(
        default_factory=list,
    )
    facilities: Optional[List[str]] = Field(
        default_factory=list,
    )
    other_organizations: Optional[List[str]] = Field(
        default_factory=list,
        description="List of names entities present in the text that don't meet facility or ngo classifications.",
    )
