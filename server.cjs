var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_net = __toESM(require("net"), 1);
var import_vite = require("vite");
var import_supabase_js = require("@supabase/supabase-js");
async function startServer() {
  const app = (0, import_express.default)();
  const requestedPort = parseInt(process.env.PORT ?? "3000", 10);
  const requestedHmrPort = parseInt(process.env.HMR_PORT ?? "24678", 10);
  async function isPortFree(port) {
    return new Promise((resolve) => {
      const tester = import_net.default.createServer().once("error", () => resolve(false)).once("listening", () => tester.close(() => resolve(true))).listen(port, "0.0.0.0");
    });
  }
  async function findAvailablePort(startPort, maxAttempts = 20) {
    let port = startPort;
    for (let i = 0; i < maxAttempts; i += 1) {
      if (await isPortFree(port)) {
        return port;
      }
      port += 1;
    }
    throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
  }
  const PORT = await findAvailablePort(requestedPort);
  const HMR_PORT = await findAvailablePort(requestedHmrPort);
  if (PORT !== requestedPort) {
    console.warn(`Port ${requestedPort} is already in use. Starting on ${PORT} instead.`);
  }
  if (HMR_PORT !== requestedHmrPort) {
    console.warn(`HMR port ${requestedHmrPort} is already in use. Using ${HMR_PORT} instead.`);
  }
  app.use(import_express.default.json());
  const configPath = import_path.default.join(process.cwd(), "src", "theme-config.json");
  const localMessagesPath = import_path.default.join(process.cwd(), "src", "local_messages.json");
  const localBlogsPath = import_path.default.join(process.cwd(), "src", "dynamic_blogs.json");
  let supabaseClient = null;
  function getSupabase() {
    if (!supabaseClient) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        supabaseClient = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
      }
    }
    return supabaseClient;
  }
  async function saveMessageLocally(payload) {
    try {
      let messages = [];
      if (import_fs.default.existsSync(localMessagesPath)) {
        const data = await import_fs.default.promises.readFile(localMessagesPath, "utf-8");
        try {
          messages = JSON.parse(data);
          if (!Array.isArray(messages)) messages = [];
        } catch (e) {
          messages = [];
        }
      }
      messages.unshift(payload);
      await import_fs.default.promises.writeFile(localMessagesPath, JSON.stringify(messages, null, 2), "utf-8");
    } catch (err) {
      console.error("Local message logging error:", err);
    }
  }
  async function readLocalBlogs() {
    try {
      if (import_fs.default.existsSync(localBlogsPath)) {
        const data = await import_fs.default.promises.readFile(localBlogsPath, "utf-8");
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Error reading local blogs, returning empty list:", e);
    }
    return [];
  }
  async function saveBlogLocally(blog) {
    try {
      const blogs = await readLocalBlogs();
      blogs.unshift(blog);
      await import_fs.default.promises.writeFile(localBlogsPath, JSON.stringify(blogs, null, 2), "utf-8");
    } catch (err) {
      console.error("Local blog saving error:", err);
    }
  }
  async function updateBlogLocally(id, updatedFields) {
    try {
      const blogs = await readLocalBlogs();
      const index = blogs.findIndex((b) => b.id === id);
      if (index !== -1) {
        blogs[index] = { ...blogs[index], ...updatedFields };
        await import_fs.default.promises.writeFile(localBlogsPath, JSON.stringify(blogs, null, 2), "utf-8");
        return true;
      }
    } catch (err) {
      console.error("Local blog updating error:", err);
    }
    return false;
  }
  async function deleteBlogLocally(id) {
    try {
      const blogs = await readLocalBlogs();
      const filtered = blogs.filter((b) => b.id !== id);
      await import_fs.default.promises.writeFile(localBlogsPath, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    } catch (err) {
      console.error("Local blog deleting error:", err);
    }
    return false;
  }
  app.get("/api/config", async (req, res) => {
    try {
      if (import_fs.default.existsSync(configPath)) {
        const data = await import_fs.default.promises.readFile(configPath, "utf-8");
        return res.json(JSON.parse(data));
      }
      return res.json({
        themeColor: "#D4AF37",
        renderMode: "constellation"
      });
    } catch (err) {
      console.error("Error reading theme config:", err);
      return res.json({
        themeColor: "#D4AF37",
        renderMode: "constellation"
      });
    }
  });
  app.post("/api/config", async (req, res) => {
    try {
      const { themeColor, renderMode } = req.body;
      const newConfig = {
        themeColor: themeColor || "#D4AF37",
        renderMode: renderMode || "constellation"
      };
      const dir = import_path.default.dirname(configPath);
      if (!import_fs.default.existsSync(dir)) {
        await import_fs.default.promises.mkdir(dir, { recursive: true });
      }
      await import_fs.default.promises.writeFile(configPath, JSON.stringify(newConfig, null, 2), "utf-8");
      return res.json({ success: true, config: newConfig });
    } catch (err) {
      console.error("Error saving theme config:", err);
      return res.status(500).json({ error: "Failed to save configuration" });
    }
  });
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, phone, message, service } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Missing required fields (name, email, message)" });
      }
      const payload = {
        name,
        email,
        phone: phone || null,
        message,
        service: service || "Direct Contact",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const supabase = getSupabase();
      if (supabase) {
        console.log("Supabase configured. Attempting to insert message:", payload);
        const { data, error } = await supabase.from("contact_messages").insert([payload]);
        if (error) {
          console.error("Supabase insertion error, falling back to local file:", error);
          await saveMessageLocally(payload);
          return res.json({
            success: true,
            savedLocally: true,
            message: "Stored locally. Supabase connection error: " + error.message
          });
        }
        return res.json({
          success: true,
          savedInSupabase: true,
          message: "Message successfully transmitted and synced to your Supabase cloud backend."
        });
      } else {
        console.log("Supabase not configured. Saving message locally.");
        await saveMessageLocally(payload);
        return res.json({
          success: true,
          savedLocally: true,
          message: "Logged locally in server workspace. Configure SUPABASE_URL and SUPABASE_ANON_KEY to sync to your live cloud database!"
        });
      }
    } catch (err) {
      console.error("Error in /api/contact:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.get("/api/blogs", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase.from("blogs").select("*").order("created_at", { ascending: false });
        if (!error && data) {
          return res.json(data);
        }
        console.error("Supabase blogs read error, falling back to local file:", error);
      }
      const localBlogs = await readLocalBlogs();
      return res.json(localBlogs);
    } catch (err) {
      console.error("Error in GET /api/blogs:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.post("/api/blogs", async (req, res) => {
    try {
      const { title, excerpt, category, readTime, tags, imageUrl, content, featured } = req.body;
      if (!title || !excerpt || !category || !content) {
        return res.status(400).json({ error: "Missing required fields (title, excerpt, category, content)" });
      }
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") + "-" + Math.floor(1e3 + Math.random() * 9e3);
      const payload = {
        id,
        title,
        excerpt,
        category,
        readTime: readTime || "3 min read",
        tags: Array.isArray(tags) ? tags : ["Dynamic"],
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=600&auto=format&fit=crop",
        content,
        featured: !!featured,
        date: (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        }),
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const supabase = getSupabase();
      if (supabase) {
        console.log("Supabase configured. Attempting to insert blog:", payload);
        const { data, error } = await supabase.from("blogs").insert([payload]);
        if (error) {
          console.error("Supabase insertion error for blog, falling back to local file:", error);
          await saveBlogLocally(payload);
          return res.json({
            success: true,
            savedLocally: true,
            id,
            message: "Blog post saved locally due to database connection error: " + error.message
          });
        }
        return res.json({
          success: true,
          savedInSupabase: true,
          id,
          message: "Blog post successfully published and synced with your Supabase cloud backend."
        });
      } else {
        console.log("Supabase not configured for blogs. Saving blog locally.");
        await saveBlogLocally(payload);
        return res.json({
          success: true,
          savedLocally: true,
          id,
          message: "Blog post saved locally in server workspace."
        });
      }
    } catch (err) {
      console.error("Error in POST /api/blogs:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.put("/api/blogs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, excerpt, category, readTime, tags, imageUrl, content, featured } = req.body;
      if (!title || !excerpt || !category || !content) {
        return res.status(400).json({ error: "Missing required fields for update (title, excerpt, category, content)" });
      }
      const updatedFields = {
        title,
        excerpt,
        category,
        readTime: readTime || "3 min read",
        tags: Array.isArray(tags) ? tags : ["Dynamic"],
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=600&auto=format&fit=crop",
        content,
        featured: !!featured
      };
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase.from("blogs").update(updatedFields).eq("id", id);
        if (error) {
          console.error("Supabase update error, falling back to local file update:", error);
          const localSuccess = await updateBlogLocally(id, updatedFields);
          return res.json({
            success: localSuccess,
            savedLocally: true,
            id,
            message: "Blog updated locally (Supabase update failed: " + error.message + ")"
          });
        }
        return res.json({
          success: true,
          savedInSupabase: true,
          id,
          message: "Blog post successfully updated in database."
        });
      } else {
        const localSuccess = await updateBlogLocally(id, updatedFields);
        return res.json({
          success: localSuccess,
          savedLocally: true,
          id,
          message: localSuccess ? "Blog post updated locally." : "Blog post not found locally."
        });
      }
    } catch (err) {
      console.error("Error in PUT /api/blogs:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.delete("/api/blogs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase.from("blogs").delete().eq("id", id);
        if (error) {
          console.error("Supabase delete error, falling back to local file delete:", error);
          const localSuccess = await deleteBlogLocally(id);
          return res.json({
            success: localSuccess,
            deletedLocally: true,
            id,
            message: "Blog deleted locally (Supabase delete failed: " + error.message + ")"
          });
        }
        return res.json({
          success: true,
          deletedFromSupabase: true,
          id,
          message: "Blog post successfully deleted from database."
        });
      } else {
        const localSuccess = await deleteBlogLocally(id);
        return res.json({
          success: localSuccess,
          deletedLocally: true,
          id,
          message: localSuccess ? "Blog post deleted locally." : "Blog post not found locally."
        });
      }
    } catch (err) {
      console.error("Error in DELETE /api/blogs:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: {
          port: HMR_PORT
        }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    if (PORT !== requestedPort) {
      console.log(`Requested port ${requestedPort} was unavailable and an alternate port was selected.`);
    }
    if (HMR_PORT !== requestedHmrPort) {
      console.log(`Requested HMR port ${requestedHmrPort} was unavailable and an alternate HMR port was selected.`);
    }
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
