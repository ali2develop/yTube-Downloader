# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['yTube Downloader.py'],
    pathex=[],
    binaries=[],
    datas=[('downloader/templates', 'downloader/templates'), ('yt_video_downloader/static', 'yt_video_downloader/static'), ('ffmpeg_bin', 'ffmpeg_bin'), ('yt_video_downloader', 'yt_video_downloader'), ('requirements.txt', '.'), ('README.md', '.'), ('manage.py', '.')],
    hiddenimports=['django.core.management.commands', 'django.contrib.admin.apps', 'django.contrib.auth.apps', 'django.contrib.contenttypes.apps', 'django.contrib.sessions.apps', 'django.contrib.messages.apps', 'django.contrib.staticfiles.apps', 'django.conf.global_settings', 'django.core.management', 'waitress', 'yt_dlp', 'whitenoise'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='yTube Downloader',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
