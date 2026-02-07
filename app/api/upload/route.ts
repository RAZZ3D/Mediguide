// app/api/upload/route.ts - Image upload to Supabase Storage

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('prescriptions')
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (error) {
            console.error('Upload error:', error);

            // Check if it's a bucket not found error
            if (error.message?.includes('bucket') || error.message?.includes('not found')) {
                return NextResponse.json(
                    {
                        error: 'Storage bucket not found',
                        details: 'Please create the "prescriptions" bucket in Supabase Storage. See SUPABASE_SETUP.md Step 4.',
                        supabaseError: error.message
                    },
                    { status: 500 }
                );
            }

            return NextResponse.json(
                { error: 'Failed to upload file', details: error.message },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('prescriptions')
            .getPublicUrl(filename);

        // Store upload metadata
        try {
            await supabase.from('uploads').insert({
                storage_path: data.path,
                ocr_text: null, // Will be updated after OCR
                ocr_confidence: null,
            });
        } catch (dbError) {
            console.error('Database error:', dbError);
            // Continue even if DB insert fails
        }

        return NextResponse.json({
            path: data.path,
            url: urlData.publicUrl,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
