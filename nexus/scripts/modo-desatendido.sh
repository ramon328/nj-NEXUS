#!/usr/bin/env bash
# modo-desatendido.sh — Deja el Mac 100% autónomo tras un corte de luz / apagón:
#   1) Se ENCIENDE solo cuando vuelve la luz (autorestart).
#   2) Apaga FileVault → el arranque ya no pide contraseña de descifrado.
#   3) Auto-login del usuario → entra a la sesión solo y cargan todos los daemons
#      (incluido com.nexus.arranque, que levanta Nexus + terminal + WhatsApp).
#
# Correr UNA vez con:   sudo bash ~/nexus/scripts/modo-desatendido.sh
#
# Seguridad: al apagar FileVault el disco queda SIN cifrar (decisión ya tomada).
set -u
USER_N="AIagenteia"
[ "$(id -u)" = 0 ] || { echo "❌ Corre con sudo:  sudo bash $0"; exit 1; }

echo "==> 1/3  Auto-encendido tras corte de luz…"
pmset -a autorestart 1 && echo "    ✅ autorestart = 1"

echo "==> 2/3  Apagando FileVault (empieza a descifrar en segundo plano; puede tardar)…"
echo "    (te pedirá el usuario y la contraseña de un usuario de FileVault)"
fdesetup disable

echo "==> 3/3  Activando auto-login de '$USER_N'…"
read -r -s -p "    Contraseña de macOS de $USER_N (NO se guarda en el historial): " PW; echo
if sysadminctl -autologin set -userName "$USER_N" -password "$PW" 2>&1; then
  echo "    ✅ auto-login activado"
else
  echo "    ⚠️  si falló, actívalo por interfaz: Ajustes del Sistema → Usuarios y Grupos → Inicio de sesión automático"
fi
unset PW

echo
echo "==> Verificación:"
echo "    autorestart : $(pmset -g | awk '/autorestart/{print $2}')"
echo "    FileVault   : $(fdesetup status)"
echo "    auto-login  : $(sysadminctl -autologin status 2>&1)"
echo "==> Listo. Tras un corte de luz: enciende solo → entra solo → Nexus queda operativo sin tocar nada."
