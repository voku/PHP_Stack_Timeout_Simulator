# PHP Stack Timeout Simulator

An interactive visualization tool that demonstrates the complex cascade of timeouts in a PHP web application stack. Understand the differences between Web Server timeouts, Process Manager timeouts, PHP CPU limits, Database timeouts, and Client timeouts.

## 🚀 Live Demo

[View Live Demo on GitHub Pages](https://voku.github.io/PHP_Stack_Timeout_Simulator/)

## 📖 Overview

This simulator helps developers and system administrators understand how different timeout configurations interact in a PHP stack. It visualizes the request lifecycle through:

- **Web Server Layer** (Nginx/Apache)
- **Process Manager** (PHP-FPM)
- **PHP Runtime** (CPU time limits)
- **External Services** (Database/API timeouts)
- **Client Side** (Browser/Load Balancer timeouts)

### Key Features

- 🔄 Real-time visualization of request flow
- 🎯 Interactive scenario testing
- ⚙️ Configurable timeout parameters
- 📊 Compare Nginx+FPM vs Apache+mod_php architectures
- 🎓 Educational tool for understanding zombie processes and timeout cascades

## 🛠️ Installation & Usage

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/voku/PHP_Stack_Timeout_Simulator.git
   cd PHP_Stack_Timeout_Simulator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 📚 Understanding the Simulator

### Timeout Types

1. **Client Timeout** (Purple) - Browser or Load Balancer gives up
2. **Web Server Timeout** (Indigo) - Nginx `fastcgi_read_timeout` or Apache `Timeout`
3. **FPM Timeout** (Orange) - PHP-FPM `request_terminate_timeout` (Nginx+FPM only)
4. **PHP CPU Limit** (Blue) - `max_execution_time` directive
5. **Database/API Timeout** (Green) - External service timeout (PDO, cURL)

### Common Scenarios

The simulator includes several pre-configured scenarios:

- **Normal Request** - Fast, successful request
- **DB Slow Query** - Query exceeds database timeout
- **API Timeout** - External API call times out
- **Infinite Loop** - CPU-bound process hits PHP limit
- **Sleep() Call** - Wall clock time without CPU consumption

### Configuration Options

Adjust timeout values to test different stack configurations:
- Client Timeout
- Web Server Timeout (Nginx/Apache)
- FPM Timeout (Nginx+FPM only)
- PHP CPU Limit
- Database/API Timeout

## 🎯 Key Files Detector - AI Helper Prompt

If you're using an AI assistant to work with this codebase, use this prompt to help it understand the key files:

```
This is a React + TypeScript application for visualizing PHP stack timeouts. Key files:

1. App.tsx - Main application component with simulation logic
2. types.ts - TypeScript type definitions
3. constants.ts - Default configuration values
4. components/ControlPanel.tsx - Timeout configuration controls
5. components/VisualMap.tsx - Visual representation of the stack
6. components/ScenarioSelector.tsx - Pre-defined test scenarios
7. components/ConfigPreview.tsx - Generated PHP/Nginx config
8. vite.config.ts - Vite build configuration
9. index.html - HTML entry point

The app simulates request flow through a web stack, tracking wall clock time vs CPU time, and shows which timeout fires first in various scenarios.
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

**Repository:** [https://github.com/voku/PHP_Stack_Timeout_Simulator](https://github.com/voku/PHP_Stack_Timeout_Simulator)

### Development Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

Created to help developers understand the subtle differences between timeout configurations in PHP web applications.

## 📞 Support

If you encounter issues or have questions:
- Open an issue on GitHub
- Check existing issues for solutions

---

Made with ❤️ for the PHP community
