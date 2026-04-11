export default (results) =>
  results
    .filter((result) => result.messages.length > 0)
    .map((result) => {
      const rules = [...new Set(result.messages.map((message) => message.ruleId).filter(Boolean))];
      return `${result.filePath}: ${rules.join(", ")}`;
    })
    .join("\n");
