# Modern AI Roles & Forward Deployed Engineering Repository

Welcome to the **Modern AI Roles & Engineering Guide** repository.

## Job tracker

From the repository root, run `python -m http.server 8000 --bind 127.0.0.1` and open [Jobbers](http://127.0.0.1:8000). Any static host that serves the repository root also works.

Nearby search uses `zip-coordinates.json`, generated from the [2025 U.S. Census ZIP Code Tabulation Area Gazetteer](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.2025.html). The browser calculates straight-line distances to approximate job locations using the coordinates served by Jobbers.

The site checks 12 public employer boards on load, on demand, and every 15 minutes while the tab is visible. It matches titles and team names to the [seven AI roles](./doc/AI_JOB_ROLES.md) and requires a recognized NYC metro location. Individually reviewed listings show a check date and expire after a week. See [Jobbers features](./doc/Jobbers_Features.md) for the feed list.

This project contains research, role breakdowns, and architectural comparisons for the latest specialized artificial intelligence jobs across frontier labs (OpenAI, Anthropic, DeepMind), enterprise platforms (Palantir, Scale AI), and high-growth AI startups.

---

## 📑 Core Documentation

- **[AI_JOB_ROLES.md](./doc/AI_JOB_ROLES.md)**: The complete comprehensive guide covering:
  - **Forward Deployed Engineer (FDE / FDSE)** (The benchmark role)
  - **AI Engineer (Product & Application)**
  - **Agentic AI Engineer (Autonomous Systems)**
  - **AI Evaluation (Evals) Engineer**
  - **Inference & AI Systems Engineer**
  - **Post-Training & Alignment Engineer**
  - **AI Solutions Engineer / Architect**
  - **Master Comparison Matrix**
  - **Career Transition Pathways & Skill Tree**

---

## 🚀 Quick Summary Matrix

| Role | Core Mission | Code Depth | Key Tools |
| :--- | :--- | :--- | :--- |
| **Forward Deployed Engineer (FDE)** | Embed with enterprise clients to build custom production AI systems | High | Python, Enterprise Cloud, Full-stack, Palantir AIP / Frontier APIs |
| **AI Engineer** | Build RAG and generative product features around foundation models | High | TypeScript/Python, LangChain, LlamaIndex, Vector DBs |
| **Agentic AI Engineer** | Architect autonomous multi-agent loops with tool use and memory | Very High | LangGraph, AutoGen, CrewAI, Sandboxed Runtimes |
| **AI Evaluation Engineer** | Scientifically benchmark model performance and run red teaming | Medium-High | Promptfoo, Braintrust, Python, Statistical Graders |
| **Inference Engineer** | Maximize token throughput, cut latency, and optimize GPU kernels | Extreme | C++, CUDA, Triton, vLLM, TensorRT-LLM |
| **Post-Training Engineer** | Fine-tune, align, and train models via SFT, DPO, and RLHF | Extreme | PyTorch, DeepSpeed, Hugging Face TRL, Ray |
| **AI Solutions Engineer** | Bridge business strategy, pre-sales, and technical enterprise architecture | Medium | AWS Bedrock, Vertex AI, Azure OpenAI, Python |

---

## 🛠️ Repository Information
- **Origin Remote:** [yumegel2/jobbers](https://github.com/yumegel2/jobbers)
- **Primary Guide:** [AI_JOB_ROLES.md](./doc/AI_JOB_ROLES.md)
