import { BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

describe('exception response privacy', () => {
  function run(error: Error) {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    new AllExceptionsFilter().catch(error, {
      switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ url: '/files?token=sensitive' }) }),
    } as never);
    return response;
  }

  it('hides unexpected error details from clients', () => {
    const response = run(new Error('internal database detail'));
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Internal server error', path: '/files' }));
  });

  it('preserves useful validation messages', () => {
    expect(run(new BadRequestException('Invalid amount')).json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid amount', statusCode: 400 }));
  });
});
