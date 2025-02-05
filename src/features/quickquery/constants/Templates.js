async function loadTemplate(templatePath) {
  try {
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${templatePath}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error loading template: ${error.message}`);
    throw error;
  }
}

export async function getQuickQueryMainHtmlPage() {
  return await loadTemplate("src/features/quickquery/templates/main.html");
}

export async function getQuickQueryErrorHtmlPage() {
  return await loadTemplate("/src/features/quickquery/templates/error.html");
}

export async function getQuickQueryTutorialHtmlPage() {
  return await loadTemplate("/src/features/quickquery/templates/tutorial.html");
}
