from typing import List, Literal, Optional

from pydantic import BaseModel, Field

ORGANIZATION_INFORMATION_SYSTEM_PROMPT = """
You extract facts ONLY about this organization: {organization}.
Be conservative. If attribution is uncertain, exclude it.

Rules (hard):
- Include a fact only if its evidence explicitly names {organization} OR uses an unambiguous pointer to it (same address/phone/URL, "this organization" within its own profile).
- If multiple facilities are on the page, ignore all others. No roll-ups or mixing.
- Do NOT infer missing details, do NOT paraphrase into new facts, do NOT fill gaps.
- If a value can't be directly mapped to {organization}, omit it.
- For official website, only include the domain name, not the full URL. Note that it must correspond to the organization's official website or else it should not be included.
- The official phone number must be the organization's primary official contact number. If it is not present, don't list it here.

**Address Parsing Rules:**
- ALWAYS parse comma-separated location strings into separate fields (city, state/region, country).
- address_line1/line2/line3 are for STREET addresses only, NOT for city/state/country.
- Country extraction is MANDATORY. Use ALL available information sources to determine the country.
- If direct country information is not explicitly stated, use contextual clues from the URL domain, phone numbers, or website content to infer the country.
- DO NOT leave country fields blank if ANY information suggests a country location.
"""


class BaseOrganization(BaseModel):
    """Base model containing shared fields between Facility and NGO."""

    name: str = Field(..., description="Official name of the organization")
    phone_numbers: Optional[List[str]] = Field(
        None,
        description="The organization's phone numbers in E164 format (e.g. '+233392022664')",
    )
    officialPhone: Optional[str] = Field(
        None,
        description="Official phone number associated with the organization in E164 format (e.g. '+233392022664')",
    )
    email: Optional[str] = Field(None, description="The organization's primary email address")
    websites: Optional[List[str]] = Field(
        None, description="Websites associated with the organization"
    )
    officialWebsite: Optional[str] = Field(
        None, description="Official website associated with the organization"
    )
    yearEstablished: Optional[int] = Field(
        None, description="The year in which the organization was established"
    )
    acceptsVolunteers: Optional[bool] = Field(
        None, description="Indicates whether the organization accepts clinical volunteers"
    )
    facebookLink: Optional[str] = Field(None, description="URL to the organization's Facebook page")
    twitterLink: Optional[str] = Field(
        None, description="URL to the organization's Twitter profile"
    )
    linkedinLink: Optional[str] = Field(None, description="URL to the organization's LinkedIn page")
    instagramLink: Optional[str] = Field(
        None, description="URL to the organization's Instagram account"
    )
    logo: Optional[str] = Field(None, description="URL linking to the organization's logo image")

    # Flattened address fields
    address_line1: Optional[str] = Field(
        None,
        description="Street address only (building number, street name). Do NOT include city, state, or country here.",
    )
    address_line2: Optional[str] = Field(
        None, description="Additional street address information (apartment, suite, building name)"
    )
    address_line3: Optional[str] = Field(None, description="Third line of street address if needed")
    address_city: Optional[str] = Field(
        None,
        description="City or town name of the organization. Parse from comma-separated location strings if needed.",
    )
    address_stateOrRegion: Optional[str] = Field(
        None,
        description="State, region, or province of the organization. Parse from comma-separated location strings if needed.",
    )
    address_zipOrPostcode: Optional[str] = Field(
        None, description="ZIP or postal code of the organization"
    )
    address_country: Optional[str] = Field(
        None,
        description="Full country name of the organization. Always extract if country or country code information is present.",
    )
    address_countryCode: Optional[str] = Field(
        None,
        description="ISO alpha-2 country code of the organization. Derive from country name if needed - this field is REQUIRED when country is known.",
    )


class Facility(BaseOrganization):
    """Pydantic model for facility structured output extraction."""

    facilityTypeId: Optional[Literal["hospital", "pharmacy", "doctor", "clinic", "dentist"]] = Field(
        None, description="type of facility (only one of these values)"
    )
    operatorTypeId: Optional[Literal["public", "private"]] = Field(
        None, description="Indicates if the facility is privately or publicly operated"
    )
    affiliationTypeIds: Optional[
        List[
            Literal["faith-tradition", "philanthropy-legacy", "community", "academic", "government"]
        ]
    ] = Field(None, description="Indicates facility affiliations. One or more of these")
    description: Optional[str] = Field(
        None, description="A brief paragraph describing the facility's services and/or history"
    )
    area: Optional[int] = Field(
        None, description="Total floor area of the facility in square meters"
    )
    numberDoctors: Optional[int] = Field(
        None, description="Total number of medical doctors working at the facility"
    )
    capacity: Optional[int] = Field(
        None, description="Overall inpatient bed capacity of the facility"
    )


class NGO(BaseOrganization):
    """Pydantic model for NGO structured output extraction."""

    countries: Optional[List[str]] = Field(
        None, description="Countries where the NGO operates. (array of ISO alpha-2 codes)"
    )
    missionStatement: Optional[str] = Field(None, description="The NGO's formal mission statement")
    missionStatementLink: Optional[str] = Field(
        None, description="A url to the NGO's published mission statement"
    )
    organizationDescription: Optional[str] = Field(
        None,
        description="A neutral, factual description derived from the mission statement (removes explicitly religious or subjective language)",
    )
