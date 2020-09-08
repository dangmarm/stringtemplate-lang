<!-- ABOUT THE PROJECT -->
## About The Project
This project is a Visual Studio Code extension for [StringTempalte v4](https://www.stringtemplate.org) language syntax highlighting.

<!-- GETTING STARTED -->
## Getting Started
For now the extension is not available in the [VSCode Marketplace](https://marketplace.visualstudio.com/VSCode) so it must be installed manually.

### Prerequisites
* The Visual Studio Code Extension Manager
```sh
npm install -g vsce
```

### Installation
* Clone this project
```sh
git clone https://github.com/dangmarm/stringtemplate-lang.git
```
* Build extension
```sh
vsce package
```
* Install extension
```sh
code --install-extension .\stringtemplate-lang-0.0.1.vsix
```

<!-- LIMITATIONS -->
## Limitations
At this moment it only supports templates that use '$' as a delimiter

<!-- LICENSE -->
## License
Distributed under the MIT License. See `LICENSE` for more information.
