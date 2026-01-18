import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Test the connection by querying site_content table
    const { data, error } = await supabase
      .from('site_content')
      .select('page, section')
      .limit(5)

    if (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
          details: error
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        connected: true,
        sampleData: data,
        recordCount: data?.length || 0
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}
