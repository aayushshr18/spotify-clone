import useUploadModal from "@/hooks/useUploadModal"
import Modal from "./Modal"
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useState } from "react";
import Input from "./Input";
import Button from "./Button";
import { toast } from "react-hot-toast";
import { useUser } from "@/hooks/useUser";
import uniqid from "uniqid";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";


const UploadModal = () => {
    const router=useRouter();
    const uploadModal=useUploadModal
    ();
    const {user}=useUser();
    const [isLoading, setIsLoading]=useState(false);
    const supabaseClient=useSupabaseClient();
    const {register, handleSubmit, reset}=useForm<FieldValues>({
        defaultValues:{
            author:'',
            title:'',
            song:null,
            image:null
        }
    })
    const onChange=(open:boolean)=>{
        if(!open){
            reset();
            uploadModal.onClose();
        }
    }
    const onSubmit: SubmitHandler<FieldValues> = async(values)=>{
        try {
            setIsLoading(true);
            const imageFile=values.image?.[0];
            const songFile=values.song?.[0];

            if(!user || !imageFile || !songFile){
                toast.error("Missing Fields!");
                return;
            }
            const uniqueID=uniqid();
            const {data:songData,
            error:songError}=await supabaseClient.storage.from('songs').upload(`song-${values.title}-${uniqueID}`,songFile,{
                cacheControl: '3600',
                upsert:false
            })
            if(songError){
                setIsLoading(false);
                return toast.error('Failed to Upload Song!')
            }

            const {data:imageData,
                error:imageError}=await supabaseClient.storage.from('images').upload(`image-${values.title}-${uniqueID}`,imageFile,{
                    cacheControl: '3600',
                    upsert:false
                })
                if(imageError){
                    setIsLoading(false);
                    return toast.error('Failed to Upload Image!')
                }

                const {
                    error:supabaseError
                }= await supabaseClient.from('songs').insert({
                    user_id:user.id,
                    title:values.title,
                    author:values.author,
                    image_path:imageData.path,
                    song_path:songData.path
                });

                if(supabaseError){
                    setIsLoading(false);
                    return toast.error("Something Went Wrong!")
                }

                router.refresh();
                setIsLoading(false);
                toast.success('Song Created!');
                reset();
                uploadModal.onClose();
        } catch (error) {
            toast.error("Something Went Wrong!");
        } finally{
            setIsLoading(false);
        }
    }

  return (
    <Modal title="Add A Song!" description="Upload a mp3 file" isOpen={uploadModal.isOpen} onChange={()=>{}} >
        <form className="flex flex-col gap-y-4" onSubmit={handleSubmit(onSubmit)} action="">
                <Input id="title" disabled={isLoading} {...register('title',{required:true})} placeholder="Song Title"/>

                <Input id="author" disabled={isLoading} {...register('author',{required:true})} placeholder="Song Author"/>

                <div className="">
                    <div className="pb-1">
                        Select a song file
                    </div>
                    <Input id="song"
                    type="file" accept=".mp3" disabled={isLoading} {...register('song',{required:true})} />
                </div>

                <div className="">
                    <div className="pb-1">
                        Select an image
                    </div>
                    <Input id="image"
                    type="file" accept="image/*" disabled={isLoading} {...register('image',{required:true})} />
                </div>
                <Button type="submit" disabled={isLoading} >Create</Button>
        </form>
    </Modal>
  )
}

export default UploadModal