# 🌊 NextFlow

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Trigger.dev](https://img.shields.io/badge/Trigger.dev-v4-FF5D13?style=for-the-badge&logo=trigger.dev)](https://trigger.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=for-the-badge&logo=clerk)](https://clerk.com/)

**The ultimate KLone (Krea-inspired clone) for building, orchestrating, and executing complex LLM workflows with pixel-perfect precision.**

NextFlow is a high-performance, DAG-based workflow builder that combines the visual elegance of Krea.ai with the industrial-strength execution power of Trigger.dev and Google Gemini.

---

## ✨ Core Features

- **🎨 Pixel-Perfect UI/UX**: A meticulous replication of the Krea.ai workflow builder interface, featuring a dark, minimal aesthetic, responsive sidebars, and an intuitive canvas.
- **🏗️ Visual DAG Canvas**: Built with **React Flow**, featuring a dot-grid background, smooth zooming/panning, MiniMap navigation, and animated purple edges.
- **⚡ Parallel Execution Engine**: Powered by **Trigger.dev**, allowing independent branches of your workflow to execute simultaneously for maximum throughput.
- **🤖 Multimodal LLM Integration**: Seamlessly chain Google Gemini models with support for text, images, and system prompts.
- **🎬 Media Processing Pipeline**: Integrated **FFmpeg** tasks for high-performance image cropping and video frame extraction directly in the cloud.
- **📜 Deep Execution History**: A persistent, node-level history panel tracking every run, status, and output with drill-down granularity.
- **🔐 Enterprise-Grade Auth**: Secure personal workspaces and history powered by **Clerk**.

---

## 🛠️ Technical Architecture

NextFlow follows the **"Thin Routing / Thick Services"** philosophy, ensuring a highly maintainable and scalable codebase.

- **Frontend**: Next.js (App Router), React Flow, Zustand (State Management), Tailwind CSS 4.
- **Backend**: Next.js Route Handlers with **Zod** validation at all boundaries.
- **Services**: Domain-driven service layer (`src/lib/services/`) isolating business logic from infrastructure.
- **Database**: PostgreSQL (Neon) with **Prisma ORM** for type-safe data access.
- **Execution**: Trigger.dev background workers for long-running, resilient tasks.
- **Media Handling**: Transloadit for robust file uploads and FFmpeg for compute-intensive processing.

---

## 🏗️ Engineering Standards

We adhere to the highest technical standards to ensure production readiness:
- **Type Safety**: 100% TypeScript with strict mode.
- **Modular Componentry**: Driven by a `BaseNode` architecture that's fully dynamic and extensible.
- **Idempotency**: All execution triggers are protected by unique constraints to prevent race conditions.
- **Observability**: Real-time pulsating glow effects on active nodes and detailed execution logs.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A Google AI Studio API Key (Gemini)
- A Clerk Account
- A Trigger.dev Account
- A Neon PostgreSQL Instance
- A Transloadit Account

### Installation

```bash
# Clone the repository
git clone https://github.com/Ujjwaljain16/NextFlow.git
cd NextFlow

# Install dependencies
npm install

# Set up the database
npx prisma generate
npx prisma db push
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
TRIGGER_SECRET_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
TRANSLOADIT_AUTH_KEY=
TRANSLOADIT_AUTH_SECRET=
TRANSLOADIT_TEMPLATE_ID=
```

### Development

```bash
# Start the Next.js development server
npm run dev

# Start the Trigger.dev dev worker (in a separate terminal)
npx trigger.dev@latest dev
```

---

## 🎯 Sample Workflow: Product Marketing Kit

NextFlow comes with a pre-built demo demonstrating building a marketing kit from scratch:
1. **Branch I**: Upload product photo → Crop to focus → LLM generates product copy.
2. **Branch II**: Upload product video → Extract key frame.
3. **Convergence**: Final LLM node synthesizes copied text and both visual assets into a social media post.


---
