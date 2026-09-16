export const getActiveSchedule = (timetable, dateStr) => {
  if (!timetable) return null;
  
  // If it's the old format (just an object with days as keys)
  if (!timetable.versions) {
    return timetable;
  }

  // Sort versions by effectiveDate descending
  const sortedVersions = [...timetable.versions].sort((a, b) => {
    return new Date(b.effectiveDate) - new Date(a.effectiveDate);
  });

  // Find the first version that is effective on or before the given date
  const activeVersion = sortedVersions.find(v => v.effectiveDate <= dateStr);

  // If no version is effective yet (e.g., all versions are in the future), return the oldest one
  if (!activeVersion && sortedVersions.length > 0) {
    return sortedVersions[sortedVersions.length - 1].schedule;
  }

  return activeVersion ? activeVersion.schedule : null;
};
