const linkedIn = 'https://www.linkedin.com/in/christian-nucifora-501432387/';
const teamSoftware = 'https://github.com/UQRacing';
const universityTeam = 'https://www.eait.uq.edu.au/community/high-school-activities-and-digital-resources/high-school-workshops-and-activities/uq-racing-visit';

// Personal claims come from the approved timeline and team summaries listed in sources/experience-sources.json.
export const experienceContent = {
  'hardware-uqr-autonomous': {
    description: 'I contribute to perception and broader electrical systems across UQ Racing\'s autonomous and electric cars. This page focuses on the autonomous program.',
    facts: [
      { label: 'Program', value: 'UQ Racing autonomous vehicle' },
      { label: 'Role', value: 'Team contributor, perception + electrical systems' },
      { label: 'Context', value: 'Formula SAE student engineering team' },
      { label: 'Status', value: 'Team program' },
    ],
    sections: [
      {
        id: 'autonomous-contribution', type: 'text', title: 'Team context',
        body: 'My Electrical Systems Engineer role at UQ Racing began in March 2026. It is listed as a part-time, hybrid role in St Lucia. Perception and electrical work are part of my contribution to the wider vehicle engineering team.',
      },
      {
        id: 'autonomous-program', type: 'text', title: 'What the autonomous program involves',
        body: 'UQ Racing develops software for electric and autonomous vehicles. The team\'s public repositories include LiDAR processing for cone detection and custom ROS messages for the autonomous vehicle.',
      },
      {
        id: 'autonomous-background', type: 'links', title: 'Public program background',
        links: [
          { label: 'UQ Racing public software organisation', url: teamSoftware },
          { label: 'UQ Racing at The University of Queensland', url: universityTeam },
        ],
      },
    ],
  },
  'hardware-uqr-electric': {
    description: 'I contribute to electrical work across UQ Racing\'s electric and autonomous cars, alongside perception work. This page focuses on the electric vehicle program.',
    facts: [
      { label: 'Program', value: 'UQ Racing electric vehicle' },
      { label: 'Role', value: 'Team contributor, electrical systems' },
      { label: 'Context', value: 'Formula SAE student engineering team' },
      { label: 'Status', value: 'Team program' },
    ],
    sections: [
      {
        id: 'electric-contribution', type: 'text', title: 'Team context',
        body: 'I contribute to electrical work within UQ Racing, alongside perception work across both cars. My Electrical Systems Engineer role began in March 2026. The electric and autonomous program records describe different parts of that team environment.',
      },
      {
        id: 'electric-program', type: 'text', title: 'Student-built electric racing',
        body: 'UQ Racing is a student-led team that designs and builds electric race cars to compete against other universities. Electrical work contributes to that shared vehicle engineering effort.',
      },
      {
        id: 'electric-background', type: 'links', title: 'Public program background',
        links: [
          { label: 'University overview of UQ Racing', url: universityTeam },
          { label: 'UQ Racing public software organisation', url: teamSoftware },
        ],
      },
    ],
  },
  'hardware-project-placeholder': {
    description: 'This bay is reserved for a hardware build. Its project name, purpose and build evidence have not been added yet.',
    placeholder: true,
    facts: [{ label: 'Status', value: 'Reserved, not a completed project' }],
    sections: [
      {
        id: 'hardware-record-to-add', type: 'text', title: 'Build record to add',
        body: 'The build record will describe the hardware, my contribution and the decisions behind it, supported by photographs, diagrams or test evidence.',
      },
    ],
  },
  'experience-uqr': {
    description: 'I joined UQ Racing as an Electrical Systems Engineer in March 2026. My team contribution includes substantial perception and broader electrical work across the autonomous and electric cars.',
    facts: [
      { label: 'Role', value: 'Electrical Systems Engineer' },
      { label: 'Organisation', value: 'UQ Racing' },
      { label: 'Period', value: 'March 2026 to present, as listed August 2026' },
      { label: 'Engagement', value: 'Part-time' },
      { label: 'Location', value: 'St Lucia, Queensland, Australia' },
      { label: 'Work mode', value: 'Hybrid' },
      { label: 'Status', value: 'Current in the August 2026 profile snapshot' },
    ],
    sections: [
      {
        id: 'uqr-role-contribution', type: 'text', title: 'My contribution',
        body: 'I contribute to perception and general electrical work across both UQ Racing cars as part of the team. The autonomous and electric vehicle pages describe the two programs.',
      },
      {
        id: 'uqr-role-program', type: 'text', title: 'The team',
        body: 'UQ Racing is The University of Queensland\'s Formula SAE team. Students design and build vehicles for competition, with electric and autonomous programs. My role sits within that shared engineering effort.',
      },
      {
        id: 'uqr-role-background', type: 'links', title: 'Team background',
        links: [
          { label: 'UQ Racing public software organisation', url: teamSoftware },
          { label: 'University overview of UQ Racing', url: universityTeam },
        ],
      },
    ],
  },
  'experience-dataannotation': {
    description: 'Remote contract software engineering with DataAnnotation, based in Brisbane and beginning in August 2026. DataAnnotation\'s public software-engineering work focuses on training and evaluating AI coding systems.',
    facts: [
      { label: 'Role', value: 'Software Engineer' },
      { label: 'Organisation', value: 'DataAnnotation' },
      { label: 'Period', value: 'August 2026 to present, as listed August 2026' },
      { label: 'Engagement', value: 'Contract' },
      { label: 'Location', value: 'Brisbane' },
      { label: 'Work mode', value: 'Remote' },
      { label: 'Platform focus', value: 'AI training and evaluation' },
      { label: 'Status', value: 'Current in the August 2026 profile snapshot' },
    ],
    sections: [
      {
        id: 'dataannotation-engineering', type: 'text', title: 'Engineering judgement for AI',
        body: 'DataAnnotation\'s public role description covers coding tasks, reviewing generated implementations, finding bugs and explaining why an approach succeeds or fails. Programming, code review and clear technical feedback support the platform\'s AI training work.',
      },
      {
        id: 'dataannotation-evaluation', type: 'text', title: 'Assessing generated software',
        body: 'The company describes testing coding agents on bug fixes, APIs and feature work, then assessing correctness, reasoning and unsafe behaviour. Its public description puts failure analysis and the quality of the resulting implementation at the centre of that evaluation.',
      },
      {
        id: 'dataannotation-public-context', type: 'links', title: 'Public role context',
        links: [{ label: 'DataAnnotation software engineering and AI training', url: 'https://www.dataannotation.tech/job-board/software-engineer' }],
      },
    ],
  },
  'experience-st-leos': {
    description: 'I worked as an IT Assistant at St Leo\'s College within The University of Queensland from February to November 2025. I provided Level 1 technical support to the college team and residents.',
    facts: [
      { label: 'Role', value: 'IT Assistant' },
      { label: 'Organisation', value: 'St Leo\'s College within The University of Queensland' },
      { label: 'Period', value: 'February 2025 to November 2025' },
      { label: 'Engagement', value: 'Part-time' },
      { label: 'Location', value: 'Brisbane, Queensland, Australia' },
      { label: 'Work mode', value: 'On-site' },
      { label: 'Status', value: 'Completed' },
    ],
    sections: [
      {
        id: 'st-leos-support', type: 'text', title: 'My contribution',
        body: 'I provided day-to-day troubleshooting and Level 1 technical support for the college team and residents. The role also included after-hours assistance. It was an on-site, part-time position in Brisbane.',
      },
    ],
  },
  'experience-uq-study': {
    description: 'I am studying a combined Bachelor of Engineering and Bachelor of Computer Science at The University of Queensland. I started in February 2024, with Electrical and Electronics Engineering as my listed field of study. July 2029 is the expected completion date.',
    facts: [
      { label: 'Role', value: 'Student' },
      { label: 'Institution', value: 'The University of Queensland' },
      { label: 'Credential', value: 'Bachelor of Engineering / Bachelor of Computer Science' },
      { label: 'Started', value: 'February 2024' },
      { label: 'Expected completion', value: 'July 2029' },
      { label: 'Field', value: 'Electrical and Electronics Engineering' },
      { label: 'Status', value: 'In progress' },
    ],
    sections: [
      {
        id: 'uq-study-practice', type: 'text', title: 'Alongside the degree',
        body: 'My UQ Racing role began in March 2026, during this degree. The Hardware rack covers my team engineering contribution, while the Software rack contains the applications and language tools in this portfolio. Those records describe the work itself; they are not a list of completed university courses.',
      },
    ],
  },
  'experience-st-augustines': {
    description: 'I attended St Augustine\'s College in Cairns from January 2018 to November 2023, before starting university in February 2024.',
    facts: [
      { label: 'Role', value: 'Student' },
      { label: 'Institution', value: 'St Augustine\'s College, Cairns' },
      { label: 'Period', value: 'January 2018 to November 2023' },
      { label: 'Status', value: 'Attendance completed' },
    ],
    sections: [],
  },
  'experience-story-placeholder': {
    title: 'Engineering + software',
    subtitle: 'Christian Nucifora',
    description: 'I\'m Christian Nucifora, an engineering and computer science student at The University of Queensland. My work includes software projects and team contributions to perception and electrical systems with UQ Racing.',
    placeholder: false,
    facts: [
      { label: 'Role', value: 'Engineering and computer science student' },
      { label: 'Study', value: 'The University of Queensland, started February 2024' },
      { label: 'Team engineering', value: 'UQ Racing, role began March 2026' },
      { label: 'Status', value: 'Introduction' },
    ],
    sections: [
      {
        id: 'story-engineering', type: 'text', title: 'Engineering in a team',
        body: 'At UQ Racing, I contribute to perception and broader electrical work across the autonomous and electric cars. The Hardware rack separates those program records and credits the work as part of the team.',
      },
      {
        id: 'story-software', type: 'text', title: 'Software projects',
        body: 'The Software rack contains the projects and their source links. M1 has its own toolchain unit, Wavelength has an audio unit, and the Personal Projects server groups smaller applications and utilities.',
      },
      {
        id: 'story-experience', type: 'text', title: 'Work and study',
        body: 'My experience also includes Level 1 IT support at St Leo\'s College during 2025 and a remote contract Software Engineer role at DataAnnotation beginning in August 2026. I am completing a combined engineering and computer science degree, with July 2029 as the expected finish.',
      },
      {
        id: 'story-profile', type: 'links', title: 'Professional profile',
        links: [{ label: 'Christian Nucifora on LinkedIn', url: linkedIn }],
      },
    ],
  },
};
