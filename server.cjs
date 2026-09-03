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
var import_config = require("dotenv/config");
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
  const host = process.env.HOST ?? "0.0.0.0";
  async function isPortFree(port) {
    return new Promise((resolve) => {
      const tester = import_net.default.createServer().once("error", () => resolve(false)).once("listening", () => tester.close(() => resolve(true))).listen(port, host);
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
  const localTestimonialsPath = import_path.default.join(process.cwd(), "src", "dynamic_testimonials.json");
  const localProjectsPath = import_path.default.join(process.cwd(), "src", "dynamic_projects.json");
  const localProjectsIndexPath = import_path.default.join(process.cwd(), "src", "dynamic_projects_index.json");
  const localProjectsLayoutPath = import_path.default.join(process.cwd(), "src", "dynamic_projects_layout.json");
  const localProjectCommentsPath = import_path.default.join(process.cwd(), "src", "dynamic_project_comments.json");
  let supabaseClient = null;
  let supabaseAdminClient = null;
  function getSupabase() {
    if (!supabaseClient) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const effectiveKey = serviceRoleKey || anonKey;
      if (supabaseUrl && effectiveKey) {
        supabaseClient = (0, import_supabase_js.createClient)(supabaseUrl, effectiveKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
      }
    }
    return supabaseClient;
  }
  function getSupabaseAdmin() {
    if (!supabaseAdminClient) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        supabaseAdminClient = (0, import_supabase_js.createClient)(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
      }
    }
    return supabaseAdminClient;
  }
  async function requireAdmin(req, res, next) {
    const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice("Bearer ".length) : "";
    const supabase = getSupabaseAdmin() || getSupabase();
    if (!token || !supabase) return res.status(401).json({ error: "Authentication required." });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(403).json({ error: "Authentication failed." });
    return next();
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
  async function readLocalTestimonials() {
    try {
      if (import_fs.default.existsSync(localTestimonialsPath)) {
        const parsed = JSON.parse(await import_fs.default.promises.readFile(localTestimonialsPath, "utf-8"));
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.error("Error reading local testimonials:", err);
    }
    return [];
  }
  async function writeLocalTestimonials(testimonials) {
    await import_fs.default.promises.writeFile(localTestimonialsPath, JSON.stringify(testimonials, null, 2), "utf-8");
  }
  async function readLocalProjects() {
    try {
      if (import_fs.default.existsSync(localProjectsPath)) {
        const data = await import_fs.default.promises.readFile(localProjectsPath, "utf-8");
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return Object.fromEntries(parsed.filter((project) => project && project.id).map((project) => [project.id, project]));
        }
        if (parsed && typeof parsed === "object") {
          const { _order: _storedOrder, ...projects } = parsed;
          return projects;
        }
        return {};
      }
    } catch (e) {
      console.error("Error reading local projects, returning empty map:", e);
    }
    return {};
  }
  async function writeLocalProjects(projects) {
    const currentData = import_fs.default.existsSync(localProjectsPath) ? JSON.parse(await import_fs.default.promises.readFile(localProjectsPath, "utf-8")) : {};
    const storedOrder = Array.isArray(currentData?._order) ? currentData._order : [];
    await import_fs.default.promises.writeFile(localProjectsPath, JSON.stringify({ _order: storedOrder, ...projects }, null, 2), "utf-8");
  }
  async function readLocalProjectOrder() {
    try {
      if (import_fs.default.existsSync(localProjectsPath)) {
        const parsed = JSON.parse(await import_fs.default.promises.readFile(localProjectsPath, "utf-8"));
        return Array.isArray(parsed?._order) ? parsed._order.filter((id) => typeof id === "string") : [];
      }
    } catch (err) {
      console.error("Error reading local project order:", err);
    }
    return [];
  }
  async function writeLocalProjectOrder(order) {
    const projects = await readLocalProjects();
    await import_fs.default.promises.writeFile(localProjectsPath, JSON.stringify({ _order: order, ...projects }, null, 2), "utf-8");
  }
  async function readLocalProjectLayout() {
    try {
      if (import_fs.default.existsSync(localProjectsLayoutPath)) {
        const parsed = JSON.parse(await import_fs.default.promises.readFile(localProjectsLayoutPath, "utf-8"));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      }
    } catch (err) {
      console.error("Error reading local project layout:", err);
    }
    return {};
  }
  async function writeLocalProjectLayout(layout) {
    await import_fs.default.promises.writeFile(localProjectsLayoutPath, JSON.stringify(layout, null, 2), "utf-8");
  }
  async function readLocalProjectIndex() {
    try {
      if (!import_fs.default.existsSync(localProjectsIndexPath)) return null;
      const parsed = JSON.parse(await import_fs.default.promises.readFile(localProjectsIndexPath, "utf-8"));
      return Array.isArray(parsed?.ids) ? parsed.ids.filter((id) => typeof id === "string") : null;
    } catch (err) {
      console.error("Error reading local project index:", err);
      return null;
    }
  }
  async function writeLocalProjectIndex(ids) {
    await import_fs.default.promises.writeFile(localProjectsIndexPath, JSON.stringify({ ids }, null, 2), "utf-8");
  }
  async function readLocalProjectComments() {
    try {
      if (import_fs.default.existsSync(localProjectCommentsPath)) {
        const parsed = JSON.parse(await import_fs.default.promises.readFile(localProjectCommentsPath, "utf-8"));
        return parsed && typeof parsed === "object" ? parsed : {};
      }
    } catch (err) {
      console.error("Error reading local project comments:", err);
    }
    return {};
  }
  async function writeLocalProjectComments(comments) {
    await import_fs.default.promises.writeFile(localProjectCommentsPath, JSON.stringify(comments, null, 2), "utf-8");
  }
  function projectRow(project, id, sortOrder = 0) {
    return {
      id,
      title: typeof project.title === "string" ? project.title.trim() : "",
      category: project.category,
      year: typeof project.year === "string" ? project.year.trim() : "",
      image_url: typeof project.imageUrl === "string" ? project.imageUrl : null,
      description: typeof project.description === "string" ? project.description.trim() : null,
      tags: Array.isArray(project.tags) ? project.tags : [],
      media: Array.isArray(project.media) ? project.media : [],
      featured_media_index: Number.isInteger(project.featuredMediaIndex) && project.featuredMediaIndex >= 0 ? project.featuredMediaIndex : 0,
      gallery_columns: project.galleryColumns === 2 ? 2 : 1,
      sort_order: sortOrder,
      show_on_home: project.showOnHome !== false
    };
  }
  function projectFromRow(project) {
    return {
      id: project.id,
      title: project.title,
      category: project.category,
      year: project.year,
      imageUrl: project.image_url || "",
      description: project.description || void 0,
      tags: Array.isArray(project.tags) ? project.tags : [],
      media: Array.isArray(project.media) ? project.media : [],
      featuredMediaIndex: project.featured_media_index ?? 0,
      galleryColumns: project.gallery_columns === 2 ? 2 : 1,
      likeCount: project.likeCount || 0,
      commentsCount: project.commentsCount || 0,
      showOnHome: project.show_on_home !== false
    };
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
  app.post("/api/config", requireAdmin, async (req, res) => {
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
  app.post("/api/auth/login", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: "Supabase authentication is not configured." });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return res.status(401).json({ error: "Invalid credentials." });
    return res.json({ accessToken: data.session.access_token, user: { email: data.user.email } });
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
        const { data, error } = await supabase.from("contact_messages").insert([payload]).select();
        if (error) {
          console.error("Supabase insertion error, falling back to local file:", error);
          console.error("Supabase payload that failed:", payload);
          await saveMessageLocally(payload);
          return res.status(500).json({
            success: false,
            savedLocally: true,
            message: "Stored locally. Supabase insert failed: " + error.message,
            error: error.message
          });
        }
        console.log("Supabase insert success:", data);
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
  app.get("/api/testimonials", async (_req, res) => {
    try {
      return res.json(await readLocalTestimonials());
    } catch (err) {
      console.error("Error in GET /api/testimonials:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.put("/api/testimonials", requireAdmin, async (req, res) => {
    try {
      const testimonials = Array.isArray(req.body?.testimonials) ? req.body.testimonials : null;
      if (!testimonials) return res.status(400).json({ error: "A testimonials array is required." });
      const sanitizedTestimonials = testimonials.map((testimonial) => ({
        quote: typeof testimonial.quote === "string" ? testimonial.quote.trim() : "",
        name: typeof testimonial.name === "string" ? testimonial.name.trim() : "",
        role: typeof testimonial.role === "string" ? testimonial.role.trim() : "",
        avatar: typeof testimonial.avatar === "string" ? testimonial.avatar.trim() : ""
      })).filter((testimonial) => testimonial.quote && testimonial.name);
      await writeLocalTestimonials(sanitizedTestimonials);
      return res.json({ success: true, testimonials: sanitizedTestimonials });
    } catch (err) {
      console.error("Error in PUT /api/testimonials:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.get("/api/projects", async (_req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const [{ data: projectRows, error: projectError }, { data: likeRows, error: likeError }, { data: commentRows, error: commentError }] = await Promise.all([
          supabase.from("projects").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
          supabase.from("project_likes").select("project_id"),
          supabase.from("project_comments").select("project_id")
        ]);
        if (projectError) throw projectError;
        if (likeError) throw likeError;
        if (commentError) throw commentError;
        const countByProject = (rows) => (rows || []).reduce((counts, row) => {
          counts[row.project_id] = (counts[row.project_id] || 0) + 1;
          return counts;
        }, {});
        const likes = countByProject(likeRows);
        const comments = countByProject(commentRows);
        return res.json({
          projects: (projectRows || []).map((project) => ({
            id: project.id,
            title: project.title,
            category: project.category,
            year: project.year,
            imageUrl: project.image_url || "",
            description: project.description || void 0,
            tags: Array.isArray(project.tags) ? project.tags : [],
            media: Array.isArray(project.media) ? project.media : [],
            featuredMediaIndex: project.featured_media_index ?? 0,
            galleryColumns: project.gallery_columns === 2 ? 2 : 1,
            likeCount: likes[project.id] || 0,
            commentsCount: comments[project.id] || 0,
            showOnHome: project.show_on_home !== false
          })),
          deletedIds: [],
          order: (projectRows || []).map((project) => project.id),
          layout: {},
          indexIds: (projectRows || []).filter((project) => project.show_on_home !== false).map((project) => project.id)
        });
      }
      const projects = await readLocalProjects();
      return res.json({
        projects: Object.values(projects).filter(Boolean),
        deletedIds: Object.keys(projects).filter((id) => projects[id] === null),
        order: await readLocalProjectOrder(),
        layout: await readLocalProjectLayout(),
        indexIds: await readLocalProjectIndex()
      });
    } catch (err) {
      console.error("Error in GET /api/projects:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.get("/api/projects/:id/comments", async (req, res) => {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase.from("project_comments").select("*").eq("project_id", req.params.id).order("created_at", { ascending: true });
      if (error) return res.status(500).json({ error: "Could not load comments." });
      return res.json((data || []).map((comment) => ({ id: comment.id, projectId: comment.project_id, displayName: comment.display_name, email: comment.email, body: comment.body, createdAt: comment.created_at })));
    }
    const comments = await readLocalProjectComments();
    return res.json(Array.isArray(comments[req.params.id]) ? comments[req.params.id] : []);
  });
  app.post("/api/projects/:id/comments", async (req, res) => {
    const body = typeof req.body?.body === "string" ? req.body.body.trim().slice(0, 500) : "";
    const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0, 80) : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().slice(0, 160) : "";
    if (!body || !displayName || !email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Display name, valid email, and comment are required." });
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase.from("project_comments").insert({ project_id: req.params.id, display_name: displayName, email, body }).select("*").single();
      if (error) return res.status(500).json({ error: "Could not save comment." });
      return res.json({ success: true, comment: { id: data.id, projectId: data.project_id, displayName: data.display_name, email: data.email, body: data.body, createdAt: data.created_at } });
    }
    const comments = await readLocalProjectComments();
    const comment = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, projectId: req.params.id, displayName, email, body, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    comments[req.params.id] = [...comments[req.params.id] || [], comment];
    await writeLocalProjectComments(comments);
    return res.json({ success: true, comment });
  });
  app.post("/api/projects/:id/like", async (req, res) => {
    const visitorId = typeof req.body?.visitorId === "string" ? req.body.visitorId.trim().slice(0, 128) : "";
    if (!visitorId) return res.status(400).json({ error: "A visitor ID is required." });
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase.from("project_likes").upsert({ project_id: req.params.id, visitor_id: visitorId }, { onConflict: "project_id,visitor_id", ignoreDuplicates: true });
      if (error) return res.status(500).json({ error: "Could not save like." });
      return res.json({ success: true });
    }
    return res.json({ success: true });
  });
  app.delete("/api/projects/:id/like", async (req, res) => {
    const visitorId = typeof req.body?.visitorId === "string" ? req.body.visitorId.trim().slice(0, 128) : "";
    if (!visitorId) return res.status(400).json({ error: "A visitor ID is required." });
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase.from("project_likes").delete().eq("project_id", req.params.id).eq("visitor_id", visitorId);
      if (error) return res.status(500).json({ error: "Could not remove like." });
    }
    return res.json({ success: true });
  });
  app.post("/api/projects", requireAdmin, async (req, res) => {
    try {
      const { title, category, imageUrl, media, featuredMediaIndex, year, galleryColumns, description, tags } = req.body;
      if (!title || !category || !year || !imageUrl && (!Array.isArray(media) || media.length === 0)) {
        return res.status(400).json({ error: "Title, category, year, and either imageUrl or media are required." });
      }
      const baseId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "project";
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data: existing } = await supabase.from("projects").select("id").eq("id", baseId).maybeSingle();
        const id2 = existing ? `${baseId}-${Date.now()}` : baseId;
        const { data: lastProject } = await supabase.from("projects").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
        const { data, error } = await supabase.from("projects").insert(projectRow(req.body, id2, (lastProject?.sort_order ?? -1) + 1)).select("*").single();
        if (error) throw error;
        return res.json({ success: true, project: projectFromRow(data) });
      }
      const projects = await readLocalProjects();
      const id = projects[baseId] ? `${baseId}-${Date.now()}` : baseId;
      const project = { id, title, category, imageUrl: imageUrl || void 0, description: typeof description === "string" ? description.trim() : void 0, tags: Array.isArray(tags) ? tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean) : [], year, media: Array.isArray(media) ? media : void 0, galleryColumns: galleryColumns === 2 ? 2 : 1 };
      projects[id] = project;
      await writeLocalProjects(projects);
      const order = await readLocalProjectOrder();
      await writeLocalProjectOrder([...order.filter((item) => item !== id), id]);
      return res.json({ success: true, project });
    } catch (err) {
      console.error("Error in POST /api/projects:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.put("/api/projects/order", requireAdmin, async (req, res) => {
    try {
      const order = Array.isArray(req.body?.order) ? req.body.order.filter((id) => typeof id === "string") : null;
      if (!order) return res.status(400).json({ error: "A project ID order array is required." });
      const layout = req.body?.layout && typeof req.body.layout === "object" ? req.body.layout : {};
      const supabase = getSupabaseAdmin();
      if (supabase) {
        for (const [sortOrder, id] of order.entries()) {
          const { error } = await supabase.from("projects").update({ sort_order: sortOrder }).eq("id", id);
          if (error) throw error;
        }
        return res.json({ success: true, order, layout });
      }
      await writeLocalProjectOrder(order);
      await writeLocalProjectLayout(layout);
      return res.json({ success: true, order, layout });
    } catch (err) {
      console.error("Error in PUT /api/projects/order:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.put("/api/projects/index", requireAdmin, async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => typeof id === "string") : null;
      if (!ids) return res.status(400).json({ error: "A project ID index array is required." });
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { error } = await supabase.from("projects").update({ show_on_home: false }).not("id", "is", null);
        if (error) throw error;
        for (const id of [...new Set(ids)]) {
          const result = await supabase.from("projects").update({ show_on_home: true }).eq("id", id);
          if (result.error) throw result.error;
        }
        return res.json({ success: true, indexIds: [...new Set(ids)] });
      }
      await writeLocalProjectIndex([...new Set(ids)]);
      return res.json({ success: true, indexIds: [...new Set(ids)] });
    } catch (err) {
      console.error("Error in PUT /api/projects/index:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.put("/api/projects/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, category, imageUrl, media, featuredMediaIndex, year, galleryColumns, description, tags } = req.body;
      if (!title || !category || !year || !imageUrl && (!Array.isArray(media) || media.length === 0)) {
        return res.status(400).json({ error: "Title, category, year, and either imageUrl or media are required." });
      }
      const projects = await readLocalProjects();
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { data, error } = await supabase.from("projects").upsert(projectRow(req.body, id)).select("*").single();
        if (error) throw error;
        return res.json({ success: true, project: projectFromRow(data) });
      }
      const project = { ...projects[id] || {}, id, title, category, imageUrl: imageUrl || void 0, description: typeof description === "string" ? description.trim() : void 0, tags: Array.isArray(tags) ? tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean) : [], year, media: Array.isArray(media) ? media : void 0, featuredMediaIndex: Number.isInteger(featuredMediaIndex) && featuredMediaIndex >= 0 ? featuredMediaIndex : void 0, galleryColumns: galleryColumns === 2 ? 2 : 1 };
      projects[id] = project;
      await writeLocalProjects(projects);
      return res.json({ success: true, project });
    } catch (err) {
      console.error("Error in PUT /api/projects:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });
  app.delete("/api/projects/:id", requireAdmin, async (req, res) => {
    try {
      const projects = await readLocalProjects();
      const { id } = req.params;
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (error) throw error;
        return res.json({ success: true, id });
      }
      if (!Object.prototype.hasOwnProperty.call(projects, id)) return res.status(404).json({ error: "Project not found." });
      projects[id] = null;
      await writeLocalProjects(projects);
      await writeLocalProjectOrder((await readLocalProjectOrder()).filter((item) => item !== id));
      return res.json({ success: true, id });
    } catch (err) {
      console.error("Error in DELETE /api/projects:", err);
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
  app.listen(PORT, host, () => {
    console.log(`Server running on http://${host === "0.0.0.0" ? "localhost" : host}:${PORT}`);
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
