"""
URL configuration for yt_video_downloader project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# yt_video_downloader/urls.py

# Video Downloader/yt_video_downloader/urls.py

# Video Downloader/yt_video_downloader/urls.py

# yt_video_downloader/urls.py

# yt_video_downloader/urls.py

# yt_video_downloader/urls.py (or downloader/urls.py if you have one)

# yt_video_downloader/urls.py
# yt_video_downloader/urls.py

# yt_video_downloader/urls.py

# yt_video_downloader/urls.py
import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('downloader.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=os.path.join(settings.BASE_DIR, 'yt_video_downloader', 'static'))
    # If you configured STATIC_ROOT, you might also have:
    # urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    # And for media files:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)