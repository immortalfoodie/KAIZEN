import asyncio
from routers.report import generate_cio_brief
async def run():
    try:
        await generate_cio_brief()
        print("SUCCESS")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(run())
