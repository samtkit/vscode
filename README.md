# SAMT

[![Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/samt.samt)](https://marketplace.visualstudio.com/items?itemName=samt.samt)
[![Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/samt.samt)](https://marketplace.visualstudio.com/items?itemName=samt.samt)
[![Marketplace Installations](https://img.shields.io/visual-studio-marketplace/i/samt.samt)](https://marketplace.visualstudio.com/items?itemName=samt.samt)
[![MIT License](https://img.shields.io/github/license/samtkit/vscode)](./LICENSE)

The SAMT extension adds language support for SAMT, the [Simple API Modeling Toolkit](https://github.com/samtkit/core), to Visual Studio Code.

New to SAMT? Check out the [Getting Started Guide](https://github.com/samtkit/core/wiki/Getting-Started) on GitHub.

## Features

At the moment, this extension provides the following features:

### Syntax Highlighting

![Syntax Highlighting](images/syntax-highliting.png)

### Snippets

![Snippets](images/snippets.gif)

### Language Server

The following features are supported via the SAMT Language Server:

- Error Reporting
- Go To Definition
- Find References
- Semantic Highlighting
- Documentation on Hover
- Outline

For these features to work you need to setup your SAMT project with a samt.yaml file. We recommend the [SAMT Template](https://github.com/samtkit/template) as a starting point.

### Compilation

This extension provides a default build task if you use the SAMT wrapper in your project:

![Task](images/task.gif)

## Contributing

Want to report a bug, contribute code, or improve documentation? Excellent!
Simply create an [issue](https://github.com/samtkit/vscode/issues),
open a [pull request](https://github.com/samtkit/vscode/pulls) or
start a [discussion](https://github.com/samtkit/vscode/discussions).

More details about the technical implementation of this extension can be found in the [GitHub wiki](https://github.com/samtkit/vscode/wiki).
