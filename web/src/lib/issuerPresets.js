// src/lib/issuerPresets.js
// Hazır preset string’leri — WPML metinleri
const PRESETS = [
`@key: studentCard
@name: Student Card
@context: https://www.w3.org/2018/credentials/v1

[fields]
subjectDid:did:Subject DID:required
name:text:Full Name:required
dept:text:Department
studentNo:text:Student No:required

[body]
{
  "@context": ["$context"],
  "type": ["VerifiableCredential", "StudentCard"],
  "issuer": "{{org.did}}",
  "credentialSubject": {
    "id": "{{subjectDid}}",
    "name": "{{name}}",
    "dept": "{{dept}}",
    "studentNo": "{{studentNo}}"
  }
}
`,

`@key: employmentAttestation
@name: Employment Attestation
@context: https://www.w3.org/2018/credentials/v1

[fields]
subjectDid:did:Subject DID:required
name:text:Full Name:required
role:text:Role/Title:required
startDate:date:Start Date:required
status:select:Employment Status:required,values=active|contractor|terminated

[body]
{
  "@context": ["$context"],
  "type": ["VerifiableCredential","EmploymentAttestation"],
  "issuer": "{{org.did}}",
  "credentialSubject": {
    "id": "{{subjectDid}}",
    "name": "{{name}}",
    "role": "{{role}}",
    "status": "{{status}}",
    "startDate": "{{startDate}}"
  },
  "evidence": [{
    "type": "HRSystemRecord",
    "verifier": "{{org.did}}",
    "referenceId": "{{uuid}}"
  }]
}
`,

`@key: kycBasic
@name: KYC Basic
@context: https://www.w3.org/2018/credentials/v1

[fields]
subjectDid:did:Subject DID:required
name:text:Full Name:required
nationality:text:Nationality
birthDate:date:Birth Date
idNumber:text:Gov ID / Passport
pep:select:PEP,values=no|yes

[body]
{
  "@context": ["$context"],
  "type": ["VerifiableCredential","KYCBasic"],
  "issuer":"{{org.did}}",
  "credentialSubject":{
    "id":"{{subjectDid}}",
    "name":"{{name}}",
    "nationality":"{{nationality}}",
    "birthDate":"{{birthDate}}",
    "idNumber":"{{idNumber}}",
    "pep":"{{pep}}"
  }
}
`,
];

export function listPresetTexts() {
  return PRESETS.slice();
}
