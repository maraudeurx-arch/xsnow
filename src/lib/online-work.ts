/** Online teaching / remote work links shown under « Travail en ligne ». */

/** Official italki teacher application (computer recommended). */
export const ITALKI_TEACH_URL = "https://teach.italki.com/application";

/** Official Preply become-a-tutor page. */
export const PREPLY_TEACH_URL = "https://preply.com/en/teach";

/**
 * AmazingTalker French tutor apply — strong Asia / Japan student demand.
 * Tutors set rates; lessons often via Zoom.
 */
export const AMAZINGTALKER_FRENCH_URL =
  "https://en.amazingtalker.com/apply-to-teach/french";

export const ONLINE_WORK_LINKS = [
  {
    id: "italki",
    label: "italki",
    url: ITALKI_TEACH_URL,
  },
  {
    id: "preply",
    label: "Preply",
    url: PREPLY_TEACH_URL,
  },
  {
    id: "amazingtalker",
    label: "AmazingTalker",
    url: AMAZINGTALKER_FRENCH_URL,
  },
] as const;
