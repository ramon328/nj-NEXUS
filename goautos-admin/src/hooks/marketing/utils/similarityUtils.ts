
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  
  const words1 = str1.split(/\s+/).filter(Boolean);
  const words2 = str2.split(/\s+/).filter(Boolean);
  
  let matches = 0;
  for (const word1 of words1) {
    if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      matches++;
    }
  }
  
  const totalWords = Math.max(words1.length, words2.length);
  return totalWords > 0 ? matches / totalWords : 0;
};
