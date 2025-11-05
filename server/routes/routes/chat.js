const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const { buildSystemPrompt } = require('../utils/systemPrompt');
const CONFIG = require('../../config');

// ===== MCP TOOL DEFINITION =====
const tools = [
  {
    name: "read_user_assets",
    description: "Lists all files in the user's assets folder. Use this to see what images/files the user has uploaded so you can reference them by their exact filenames. Call this immediately when user mentions uploading files or when you need to suggest which files to use where.",
    input_schema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID whose assets folder to read (e.g., 'test_user_001')"
        }
      },
      required: ["userId"]
    }
  },
  {
    name: "read_conversation",
    description: "Reads the full conversation history from conversation.json. Use this when resuming a session to catch up on what's been discussed.",
    input_schema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID whose conversation to read"
        }
      },
      required: ["userId"]
    }
  },
  {
    name: "read_metadata",
    description: "Reads business data and asset mappings from metadata.json. Shows what business info has been collected.",
    input_schema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID whose metadata to read"
        }
      },
      required: ["userId"]
    }
  },
  {
    name: "read_sitemap",
    description: "Reads the page structure from sitemap.json. Shows what pages have been defined.",
    input_schema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID whose sitemap to read"
        }
      },
      required: ["userId"]
    }
  },
  {
    name: "read_styles",
    description: "Reads brand colors, fonts, and reference site from styles.css. Shows what brand identity has been set.",
    input_schema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID whose styles to read"
        }
      },
      required: ["userId"]
    }
  }
];

// ===== MCP TOOL EXECUTION HANDLER =====
async function handleToolCall(toolName, toolInput) {
  console.log(`🔧 MCP Tool Called: ${toolName}`, toolInput);

  if (toolName === "read_user_assets") {
    const { userId } = toolInput;
    const assetsPath = path.join(__dirname, '../../prospects', userId, 'assets');

    try {
      const files = await fs.readdir(assetsPath);

      // Filter for image files only
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      });

      const result = {
        success: true,
        files: imageFiles,
        count: imageFiles.length,
        message: imageFiles.length > 0
          ? `Found ${imageFiles.length} file(s): ${imageFiles.join(', ')}`
          : 'No files uploaded yet'
      };

      console.log(`📂 MCP Tool Result:`, result);
      return result;

    } catch (error) {
      // Folder doesn't exist yet = no files uploaded
      if (error.code === 'ENOENT') {
        const result = {
          success: true,
          files: [],
          count: 0,
          message: 'No files uploaded yet (assets folder does not exist)'
        };
        console.log(`📂 MCP Tool Result:`, result);
        return result;
      }

      // Other errors
      console.error(`❌ MCP Tool Error:`, error);
      return {
        success: false,
        error: error.message,
        files: [],
        count: 0
      };
    }
  }

  // NEW TOOL HANDLERS FOR SESSION RESUMPTION
  const { userId } = toolInput;
  const prospectPath = path.join(__dirname, '../../prospects', userId);

  if (toolName === "read_conversation") {
    try {
      const conversationPath = path.join(prospectPath, 'conversation.json');
      const data = await fs.readFile(conversationPath, 'utf-8');
      const parsed = JSON.parse(data);
      const result = {
        success: true,
        messages: parsed.messages || [],
        messageCount: (parsed.messages || []).length,
        lastUpdated: parsed.updatedAt || 'unknown'
      };
      console.log(`📂 MCP Tool Result:`, result);
      return result;
    } catch (error) {
      const result = {
        success: true,
        messages: [],
        messageCount: 0,
        message: 'No conversation history yet (new session)'
      };
      console.log(`📂 MCP Tool Result:`, result);
      return result;
    }
  }

  if (toolName === "read_metadata") {
    try {
      const metadataPath = path.join(prospectPath, 'metadata.json');
      const data = await fs.readFile(metadataPath, 'utf-8');
      const parsed = JSON.parse(data);
      const result = {
        success: true,
        metadata: parsed,
        businessName: parsed.businessName || null,
        hasLogo: !!parsed.logo,
        hasHeroImage: !!parsed.heroImage
      };
      console.log(`📂 MCP Tool Result:`, result);
      return result;
    } catch (error) {
      const result = {
        success: true,
        metadata: {},
        message: 'No metadata collected yet'
      };
      console.log(`📂 MCP Tool Result:`, result);
      return result;
    }
  }

  if (toolName === "read_sitemap") {
    try {
      const sitemapPath = path.join(prospectPath, 'sitemap.json');
      const data = await fs.readFile(sitemapPath, 'utf-8');
      const parsed = JSON.parse(data);
      const result = {
        success: true,
        pages: parsed.pages || [],
        pageCount: (parsed.pages || []).length
      };
      console.log(`📂 MCP Tool Result:`, result);
      return result;
    } catch (error) {
      const result = {
        success: true,
        pages: [],
        pageCount: 0,
        message: 'No pages defined yet'
      };
      console.log(`📂 MCP Tool Result:`, result);
      return result;
    }
  }

  if (toolName === "read_styles") {
    try {
      const stylesPath = path.join(prospectPath, 'styles.css');
      const data = await fs.readFile(stylesPath, 'utf-8');

      // Parse CSS for key info
      const primaryColorMatch = data.match(/--primary-color:\s*([^;]+)/);
      const fontMatch = data.match(/--font-heading:\s*([^;]+)/);
      const referenceMatch = data.match(/\/\*\s*Reference:\s*([^\*]+)\*\//);

      const result = {
        success: true,
        primaryColor: primaryColorMatch ? primaryColorMatch[1].trim() : null,
        fontHeading: fontMatch ? fontMatch[1].trim() : null,
        referenceSite: referenceMatch ? referenceMatch[1].trim() : null,
        rawCSS: data.substring(0, 500) + '...' // First 500 chars for context
      };
      console.log(`📂 MCP Tool Result:`, result);
      return result;
    } catch (error) {
      const result = {
        success: true,
        primaryColor: null,
        fontHeading: null,
        referenceSite: null,
        message: 'No brand styles set yet'
      };
      console.log(`📂 MCP Tool Result:`, result);
      return result;
    }
  }

  return {
    success: false,
    error: "Unknown tool: " + toolName
  };
}

// ===== MAIN CHAT HANDLER =====
module.exports = async (req, res) => {
  try {
    const { messages } = req.body;

    // Build system prompt from all brain modules
    const systemPrompt = await buildSystemPrompt();

    console.log(`💬 Chat request with ${messages.length} messages`);

    // Initial API call with MCP tools
    let response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.ANTHROPIC_API_KEY,
        'anthropic-version': CONFIG.API_VERSION
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: CONFIG.MAX_TOKENS,
        temperature: 1.0,
        tools: tools,  // Enable MCP tools
        system: systemPrompt,
        messages: messages
      })
    });

    let data = await response.json();

    // Handle tool use loop
    let toolUseIterations = 0;
    const maxIterations = 5; // Prevent infinite loops

    while (data.stop_reason === "tool_use" && toolUseIterations < maxIterations) {
      toolUseIterations++;
      console.log(`🔄 Tool use detected (iteration ${toolUseIterations})`);

      // Find all tool use blocks in the response
      const toolUseBlocks = data.content.filter(block => block.type === "tool_use");

      if (toolUseBlocks.length === 0) break;

      // Add Claude's response (including tool_use blocks) to messages
      messages.push({
        role: "assistant",
        content: data.content
      });

      // Execute all tool calls and collect results
      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        const toolResult = await handleToolCall(toolUse.name, toolUse.input);

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Add tool results as user message
      messages.push({
        role: "user",
        content: toolResults
      });

      // Continue conversation with tool results
      response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.ANTHROPIC_API_KEY,
          'anthropic-version': CONFIG.API_VERSION
        },
        body: JSON.stringify({
          model: CONFIG.MODEL,
          max_tokens: CONFIG.MAX_TOKENS,
          temperature: 1.0,
          tools: tools,
          system: systemPrompt,
          messages: messages
        })
      });

      data = await response.json();
    }

    if (toolUseIterations >= maxIterations) {
      console.warn('⚠️ Max tool use iterations reached');
    }

    console.log(`✅ Chat response ready (${toolUseIterations} tool calls)`);

    // Return final response
    res.json(data);

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({ error: error.message });
  }
};
