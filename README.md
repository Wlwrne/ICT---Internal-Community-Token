# English
# Internal Community Token Control Panel

This repository contains a web-based interface for interacting with the Internal Community Token smart contract on the Sepolia test network.

## Project Overview

This is a frontend dashboard for managing and testing smart contract functions such as:

- wallet connection via Brave Wallet
- contract data loading
- whitelist management
- token minting and burning
- token transfers
- treasury-based distribution
- role inspection and role management
- frozen account handling

The interface is designed for administrative and testing purposes only.

## Tech Stack

- `index.html`
- `style.css`
- `app.js` 
- `abi.json`
- `Ethereum (Sepolia testnet)`
- `Brave Wallet`

## How to Use

1. Open the deployed GitHub Pages site in a browser.
2. Connect BraveWallet.
3. Make sure your wallet is set to the **Sepolia** network.
4. Use the available tabs to interact with the smart contract.
5. Refresh contract data when needed.

## A bit about roles

- Some actions are restricted by role:
  - `Admin` can access administrative functions
  - `Manager` can access treasury distribution functions
  - `Frozen` accounts are restricted from certain actions

## Requirements

- A browser with Brave Wallet installed
- Access to the Sepolia test network

## Disclaimer

This project is a **learning and testing project** for smart contract interaction and administrative UI development.

It is provided **as is**, without any warranty of any kind.  
It should not be considered production-ready software.

Use it only for educational, experimental, or internal testing purposes.  
Always verify contract addresses, permissions, and network settings before performing any action.

# Česky

# Internal Community Token Control Panel

Tento repozitář obsahuje webové rozhraní pro práci se smart kontraktem Internal Community Token na testovací síti Sepolia.

## Přehled projektu

Toto je frontendový dashboard pro správu a testování funkcí smart kontraktu, například:

- připojení peněženky přes Brave Wallet
- načítání dat kontraktu
- správa whitelistu
- mintování a spalování tokenů
- převody tokenů
- distribuce z treasury
- kontrola rolí a správa oprávnění
- práce se zmrazenými účty

Rozhraní je určeno pouze pro administrativní a testovací účely.

## Technologie

- `index.html`
- `style.css` 
- `app.js` 
- `abi.json`
- `Ethereum (Sepolia testnet)`
- `Brave Wallet`

## Jak používat

1. Otevřite nasazenou stránku přes GitHub Pages v prohlížeči.
2. Připojte Brave Wallet.
3. Ujistěte se, že je peněženka přepnuta na síť **Sepolia**.
4. K práci se smart kontraktem použijte dostupné záložky.
5. Podle potřeby obnovte data kontraktu.

## Trochu o rolích

- Některé funkce jsou omezené podle rolí:
  - `Admin` má přístup k administrativním funkcím
  - `Manager` má přístup k distribučním funkcím treasury
  - `Frozen` účty mají omezený přístup k některým funkcím

## Požadavky

- Prohlížeč s nainstalovaným Brave Wallet
- Přístup k testovací síti Sepolia

## Upozornění

Tento projekt je **výukový a testovací projekt** pro práci se smart kontrakty a vývoj administračního rozhraní.

Je poskytován **tak, jak je**, bez jakékoli záruky.  
Není určen pro produkční nasazení.

Používejte jej pouze pro vzdělávací, experimentální nebo interní testovací účely.  
Před jakoukoli akcí vždy ověřte adresy kontraktů, oprávnění a nastavení sítě.
