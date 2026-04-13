export const summarizeOpenAIOutput = (output: string) => {
  return {
    hasText: output.trim().length > 0,
    textPreview: output.trim().slice(0, 120) || null
  };
};
