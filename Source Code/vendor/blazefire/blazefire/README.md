# Blazefire

Blazefire framework powered by Frostfast compiler.

## Install

Do not install the npm-squatted package name. Install the framework source directly:

```bash
npm install github:arts009009009/Blazefire
# or from a local checkout
# npm install file:../vendor/blazefire
```

## Usage

```tsx
import Blazefire, { BlazefireProvider, createCompiler } from "blazefire";
import "blazefire/styles";
import { BlazefireLogo } from "blazefire/components/BlazefireLogo";
import translations from "blazefire/data/navbar-translate.json";

const compiler = createCompiler();

export function App() {
  return (
    <BlazefireProvider>
      <BlazefireLogo size={24} />
      <p>{translations.Home?.en ?? "Home"}</p>
    </BlazefireProvider>
  );
}
```
