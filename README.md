# Mayank's CV Builder 📄

A Node.js-powered LaTeX CV compilation and development server with live preview and file watching.

## Features ✨

- **🔄 Live Compilation**: Automatically rebuilds CV when you edit any `.tex` files
- **🌐 Web Dashboard**: Beautiful web interface for building and managing your CV
- **📱 Live Preview**: Real-time PDF preview in your browser
- **🧹 Smart Cleanup**: Removes auxiliary LaTeX files automatically
- **📝 File Editor**: Edit LaTeX files directly in the browser
- **⚡ WebSocket Updates**: Real-time build status and notifications
- **🎯 One-Click Build**: Build your CV with a single button click

## About the Template

**Awesome Source Latex CV** is based on a CV template created by Alessandro Plasmati. The original template use _XeLaTeX_ engine and _[Fontin Sans](http://www.exljbris.com/fontinsans.html)_ font.

More informations about the original Alessandro Plasmati template can be found here :

- [ Scribd ](http://fr.scribd.com/doc/16335667/Writing-your-Professional-CV-with-LaTeX)
- [ LaTeX Templates ](http://www.latextemplates.com/template/plasmati-graduate-cv)
- [ ShareLatex ](https://www.sharelatex.com/templates/cv-or-resume/professional-cv)

**Personal data** has moved on top of the first page just before the position and _[Fontin Sans](http://www.exljbris.com/fontinsans.html)_ font has been replaced by _[Source Sans Pro Font](https://github.com/adobe-fonts/source-sans-pro)_ from Adobe. _[Font Awesome](http://fontawesome.io/)_ icons are used to highlight important elements.

Unlike _Alessandro Plasmati_ CV template, all layout stuff in **Awesome Source Latex CV** has moved in the Latex class file _awesome-source-cv.cls_.

## Prerequisites 📋

1. **Node.js** (v14 or higher)
2. **LuaTeX** (part of MacTeX or BasicTeX)

### Installing LuaTeX on macOS:

```bash
# Option 1: Full MacTeX (recommended)
brew install --cask mactex

# Option 2: Smaller BasicTeX
brew install --cask basictex
sudo tlmgr update --self
sudo tlmgr install fontspec babel luainputenc xcolor geometry fontawesome hyperref titlesec enumitem longtable etoolbox tikz tcolorbox fancyhdr
```

## Quick Start 🚀

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the development server:**

   ```bash
   npm start
   ```

3. **Open your browser:** The dashboard will automatically open at `http://localhost:3000`

## Usage 💡

### Command Line Options

```bash
# Start the full development server with web dashboard
npm start

# Build CV once
npm run build

# Watch files and auto-rebuild
npm run watch

# Clean auxiliary files
npm run clean

# Development mode (clean + watch)
npm run dev
```

### Web Dashboard

The web dashboard provides:

- **Build Controls**: One-click CV compilation
- **Status Monitor**: Real-time build status and PDF information
- **File Manager**: Quick access to edit LaTeX files
- **Live Logs**: Build output and error messages
- **PDF Preview**: Embedded PDF viewer

## Original Quick Start Instructions

### API Endpoints

- `POST /api/build` - Trigger CV build
- `POST /api/clean` - Clean auxiliary files
- `GET /api/status` - Get build status and PDF info
- `GET /cv.pdf` - Download/view the compiled PDF
- `GET /api/file/:filename` - Get file content
- `POST /api/file/:filename` - Save file content

## Project Structure 📁

```
src/                             # Source files
  ├── cv.tex                     # Main CV document
  ├── yaac-another-awesome-cv.cls # CV class file
  ├── section_*.tex              # CV sections
  └── fonts/                     # Custom fonts
server.js                        # Main development server
build.js                         # Build system
package.json                     # Node.js dependencies
scripts/                         # Utility scripts
  └── clean.js                   # Cleanup script
```

## Original Template Usage

You can edit online **Awesome Source Latex CV** on [Overleaf](https://www.overleaf.com/latex/templates/awesome-source-cv/wrdjtkkytqcw). Feel free to use my [referal link](https://www.overleaf.com/signup?ref=54c221604cd6) if you want to create your account.

## Troubleshooting 🔧

### Common Issues

**"LuaTeX not found"**

- Install MacTeX or BasicTeX as described above
- Verify installation: `lualatex --version`

**"Build failed"**

- Check the build logs in the dashboard
- Ensure all referenced files exist
- Verify LaTeX syntax in your `.tex` files

**"PDF not updating"**

- Hard refresh your browser (Cmd+Shift+R)
- Check if the build actually succeeded
- Clear browser cache

**"WebSocket connection failed"**

- Restart the server
- Check if another process is using port 3000
- Try a different port: `PORT=3001 npm start`

## LaTeX Template Usage

## How to use **Awesome Source CV** latex class

### Construct the header

Outside of the `\socialinfo` wrapper you have to define the mandatory parameters `\name` and `\tagline`.

```latex
% Define author's name
% Usage: \name{<firstname>}{<lastname>}
% Mandatory
\name{Christophe}{ROGER}

% Define author's photo (optional)
% Usage \photo{<diameter>}{<photo>}
\photo{2.5cm}{darwiin}

% Define author's tagline
% Usage: \tagline{<tag line>}
% Mandatory
\tagline{Chef de projet IT}
```

Most social network have their command to render a clickable link or a simple text entry.

```latex
% Render author's linked-in (optional)
% Usage: \linkedin{<linked-in-nick>}
\linkedin{christopheroger}

% Render author's viadeo(optional)
% Usage: \viadeo{<viadeo-nick>}
\viadeo{christopheroger}

% Render author's github (optional)
% Usage: \github{<github-nick>}
\github{darwiin}

% Render author's email (optional)
% Usage: \email{<email adress>}
\email{christophe.roger@mail.com}
```

Put these command in the `\socialinfo` wrapper. Feel free to add `\\` when you want to force a new line.

```latex
\socialinfo{
  \linkedin{christopheroger}
  \viadeo{christopheroger}
  \github{darwiin}\\
  \smartphone{+687 123 456}
  \email{christophe.roger@mail.com}\\
  \address{2 Rue du quartier, 98765 Ville, Pays}\\
  \infos{Né le 23 septembre 1982 (34 ans) à Nouméa, Nouvelle-Calédonie}
}
```

Use the `\makecvheader`command to generate the header.

```latex
\makecvheader
```

### Construct the _experiences_ section

To describe your experiences you have first to declare the `experiences` environment

```latex
% Begin a new experiences environment to use experience and consultantexperience macro
\begin{experiences}

% Here's go your experiences

\end{experiences}
```

Then you can describe your experiences using **\experience** and **\consultantexperience** entries. Each
entry must be separated by the **\emptyseparator**

```latex
% Begin a new experiences environment to use experience and consultantexperience macro
\begin{experiences}

% The experience entry work as below and can be used to describe a job experience
  \experience
    {End date}      {Experience title}{Enterprise}{Country}
    {Begin date}    {
    				  experience details
                      \begin{itemize}
                        \item Item 1: _Item 1 description_
                        \item Item 2: _Item 2 description_
                        \item Item 3: _Item 3 description_
                      \end{itemize}
                    }
                    {Technology highlights}

% The emptyseparator macro is used to create white space in your experience
  \emptySeparator

% The consultantexperience macro is very similar to the experience macro, but offer you
% the possibility tu put client details
  \consultantexperience
    {End date}        {Experience title}{Enterprise}{Country}
    {Begin date}      {Client job title}{Clent enterprise}
                    {
                      experience details
                      \begin{itemize}
                        \item Item 1: _Item 1 description_
                        \item Item 2: _Item 2 description_
                        \item Item 3: _Item 3 description_
                      \end{itemize}
                    }
                    {Technology highlights}
\end{experiences}
```

## License 📄

Latex class file _awesome-source-cv.cls_ is published under the term of the [LPPL Version 1.3c](https://www.latex-project.org/lppl.txt).

All content files are published under the term of the [CC BY-SA 4.0 License](https://creativecommons.org/licenses/by-sa/4.0/legalcode).

---

**Happy CV building with Node.js!** 🎉
