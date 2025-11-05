/**
 * PromptBuilder - Orchestrates the building of system prompts
 * Loads and combines modular prompt sections
 */
class PromptBuilder {
  constructor() {
    this.sections = [];
    this.loadSections();
  }

  /**
   * Load all prompt sections
   * Sections are loaded in priority order
   */
  loadSections() {
    const PersonalitySection = require('./sections/PersonalitySection');
    const MCPSection = require('./sections/MCPSection');
    const SessionSection = require('./sections/SessionSection');
    const TaggingSection = require('./sections/TaggingSection');

    this.sections = [
      new PersonalitySection(),
      new SessionSection(),
      new TaggingSection(),
      new MCPSection()
    ];

    // Sort by priority (higher first)
    this.sections.sort((a, b) => b.priority - a.priority);

    console.log(`📝 PromptBuilder: Loaded ${this.sections.length} sections`);
  }

  /**
   * Build the complete system prompt
   * @param {Object} context - Build context
   * @returns {Promise<string>} - Complete system prompt
   */
  async build(context = {}) {
    const parts = [];

    // Add header
    parts.push('You are Nitya - StarterNode\'s Lead Design Consultant.');
    parts.push('');
    parts.push('---');
    parts.push('');

    // Generate each section
    for (const section of this.sections) {
      if (section.shouldInclude(context)) {
        console.log(`📝 PromptBuilder: Including section: ${section.name}`);
        try {
          const content = await section.generate(context);
          parts.push(content);
          parts.push(''); // Blank line between sections
        } catch (error) {
          console.error(`❌ PromptBuilder: Failed to generate section ${section.name}:`, error);
          // Continue with other sections
        }
      } else {
        console.log(`📝 PromptBuilder: Skipping section: ${section.name}`);
      }
    }

    const prompt = parts.join('\n');
    console.log(`✅ PromptBuilder: Built prompt (${prompt.length} characters, ${this.sections.length} sections)`);

    return prompt;
  }

  /**
   * Get section by name
   * @param {string} name - Section name
   * @returns {Object|null} - Section instance or null
   */
  getSection(name) {
    return this.sections.find(s => s.name === name) || null;
  }

  /**
   * Get all section names
   * @returns {Array<string>} - Section names
   */
  getSectionNames() {
    return this.sections.map(s => s.name);
  }
}

module.exports = PromptBuilder;
