import { CameraPhoto, CameraResultType, CameraSource, Capacitor, FilesystemDirectory } from '@capacitor/core'
import { useCamera } from '@ionic/react-hooks/camera'
import { useEffect, useState } from 'react'
import { base64FromPath, useFilesystem } from '@ionic/react-hooks/filesystem'
import { useStorage } from '@ionic/react-hooks/storage'
import { isPlatform } from '@ionic/react'


export interface Photo {
    filePath: string;
    webviewPath?: string;
}

const PHOTO_STORAGE = 'fotoss';

export function usePhotoGallery() {
    const { getPhoto } = useCamera()
    const [photos, setPhotos] = useState<Photo[]>([])
    const { deleteFile, getUri, readFile, writeFile } = useFilesystem()
    const { get, set }  = useStorage()

    useEffect(() => {
        const loadSaved = async () => {
            const photosString = await get('photos');
            const photosInStorage = (photosString ? JSON.parse(photosString) : []) as Photo[];
            // If running on the web...
            if (!isPlatform('hybrid')) {
                for (let photo of photosInStorage) {
                const file = await readFile({
                    path: photo.filePath,
                    directory: FilesystemDirectory.Data
                });
                // Web platform only: Load photo as base64 data
                photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
                }
            }
            setPhotos(photosInStorage);
        }
        loadSaved()
    }, [get, readFile])

    const savePicture = async (photo: CameraPhoto, fileName: string): Promise<Photo> => {
        let base64Data: string;
        // "hybrid" will detect Cordova or Capacitor;
        if (isPlatform('hybrid')) {
          const file = await readFile({
            path: photo.path!
          });
          base64Data = file.data;
        } else {
          base64Data = await base64FromPath(photo.webPath!);
        }
        const savedFile = await writeFile({
          path: fileName,
          data: base64Data,
          directory: FilesystemDirectory.Data
        });
      
        if (isPlatform('hybrid')) {
          // Display the new image by rewriting the 'file://' path to HTTP
          // Details: https://ionicframework.com/docs/building/webview#file-protocol
          return {
            filePath: savedFile.uri,
            webviewPath: Capacitor.convertFileSrc(savedFile.uri),
          };
        }
        else {
          // Use webPath to display the new image instead of base64 since it's
          // already loaded into memory
          return {
            filePath: fileName,
            webviewPath: photo.webPath
          };
        }
    }

    const takePhoto = async () => {
        const cameraPhoto = await getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100
        });

        const fileName = new Date().getTime()  + '.jpeg';
        const savedFileImage = await savePicture(cameraPhoto, fileName);
        const newPhotos = [savedFileImage, ...photos]
        set(PHOTO_STORAGE, JSON.stringify(newPhotos))
        setPhotos(newPhotos);
    }

    return {
        photos,
        takePhoto
    }
}