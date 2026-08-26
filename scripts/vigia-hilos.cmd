@echo off
rem Lanzador para el Programador de tareas: registra la salida y no deja ventana.
cd /d "%~dp0.."
if not exist vigia mkdir vigia
"C:\Program Files\nodejs\node.exe" scripts\vigia-hilos.mjs >> vigia\vigia.log 2>&1
